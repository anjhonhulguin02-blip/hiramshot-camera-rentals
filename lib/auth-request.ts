export async function boundedAuthRequest(request:Request){
 if(request.method!=='POST')return request;
 if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')throw new Error('origin');
 if(Number(request.headers.get('content-length'))>8192)throw new Error('size');
 const reader=request.body?.getReader();if(!reader)return request;
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();throw new Error('size');}chunks.push(value);}}finally{reader.releaseLock();}
 const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}
 // Use explicit web Request fields: framework Request subclasses can carry
 // consumed internal body state even when a replacement body is supplied.
 return new Request(request.url,{method:request.method,headers:request.headers,body:body as BodyInit,redirect:request.redirect,signal:request.signal});
}
