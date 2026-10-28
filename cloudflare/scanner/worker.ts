import {Container,getContainer} from '@cloudflare/containers';
type ScannerEnv={SCANNER_INSTANCE:DurableObjectNamespace<ClamScanner>;MALWARE_SCANNER_TOKEN:string};
export class ClamScanner extends Container<ScannerEnv>{
 defaultPort=8080;
 sleepAfter='5m';
 // Only engine signature updates require outbound access. No file is sent outside this container.
 enableInternet=true;
 envVars={SCANNER_TOKEN:this.env.MALWARE_SCANNER_TOKEN};
 override onError(){return undefined;} // No request bodies, tokens or file details in logs.
}
async function authenticated(request:Request,secret:string){
 if(!secret||secret.length<32)return false;
 const supplied=request.headers.get('authorization')||'';
 const hash=(value:string)=>crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 const [expected,actual]=await Promise.all([hash('Bearer '+secret),hash(supplied)]);
 const a=new Uint8Array(expected),b=new Uint8Array(actual);let different=0;for(let i=0;i<a.length;i++)different|=a[i]^b[i];return different===0;
}
export default {async fetch(request:Request,env:ScannerEnv){
 const deny=(status:number,error:string)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
 if(!await authenticated(request,env.MALWARE_SCANNER_TOKEN))return deny(401,'Private scanner authentication required.');
 const path=new URL(request.url).pathname;if(!((path==='/scan'&&request.method==='POST')||(path==='/health'&&request.method==='GET')))return deny(404,'Not found.');
 try{
  const headers=new Headers({'Authorization':'Bearer '+env.MALWARE_SCANNER_TOKEN});let body:Uint8Array|undefined;
  if(path==='/scan'){
   if(request.headers.get('content-type')!=='application/octet-stream')return deny(415,'Expected raw file bytes.');
   const reader=request.body?.getReader();if(!reader)return deny(400,'File required.');const parts:Uint8Array[]=[];let size=0;
   try{while(true){const value=await reader.read();if(value.done)break;size+=value.value.length;if(size>5*1024*1024)return deny(413,'File too large.');parts.push(value.value);}}finally{await reader.cancel().catch(()=>{});}
   if(!size)return deny(400,'File required.');body=new Uint8Array(size);let offset=0;for(const part of parts){body.set(part,offset);offset+=part.length;}
   headers.set('Content-Type','application/octet-stream');headers.set('Content-Length',String(size));
  }
  // One fixed instance: caller-controlled names cannot create unbounded billable instances.
  return await getContainer(env.SCANNER_INSTANCE,'kyc-private').fetch(new Request('http://container'+path,{method:request.method,headers,body:body as BodyInit|undefined,signal:AbortSignal.timeout(18000)}));
 }catch{return deny(503,'Scanner warming up or unavailable. Retry in one minute.');}
}};
