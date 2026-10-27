export function canonicalRequest(request:Request){
 const url=new URL(request.url),headers=new Headers(request.headers);
 headers.delete('forwarded');headers.set('host',url.host);headers.set('x-forwarded-host',url.host);headers.set('x-forwarded-proto',url.protocol.slice(0,-1));
 return new Request(request,{headers});
}
