import {isIP} from 'node:net';
export function trustedClientIp(request:Request,platform:string,development:boolean,vercelHosted:boolean){
 if(development)return '127.0.0.1';
 const raw=platform==='sites'?request.headers.get('cf-connecting-ip'):vercelHosted?request.headers.get('x-forwarded-for')?.split(',')[0].trim():null;
 return raw&&isIP(raw)?raw:'unavailable';
}
