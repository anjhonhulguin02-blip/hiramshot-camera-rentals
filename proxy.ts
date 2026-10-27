import {NextResponse,type NextRequest} from 'next/server';
import {contentSecurityPolicy} from './lib/http-security';
export function proxy(request:NextRequest){
 const url=request.nextUrl,origin=request.headers.get('origin');
 if(request.method==='OPTIONS'&&url.pathname.startsWith('/api/'))return new NextResponse(null,{status:origin===url.origin?204:403,headers:origin===url.origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}:{}});
 const canonical=process.env.APP_BASE_URL,domain=process.env.CUSTOM_DOMAIN;
 if(canonical&&domain&&[domain,'www.'+domain].includes(url.hostname)&&url.origin!==canonical)return NextResponse.redirect(new URL(url.pathname+url.search,canonical),308);
 const headers=new Headers(request.headers);for(const key of headers.keys())if(key.startsWith('oai-authenticated-user-')||key==='cf-connecting-ip')headers.delete(key);
 const response=NextResponse.next({request:{headers}});
 response.headers.set('X-Content-Type-Options','nosniff');response.headers.set('X-Frame-Options','DENY');response.headers.set('Referrer-Policy','strict-origin-when-cross-origin');response.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');response.headers.set('Content-Security-Policy',contentSecurityPolicy(process.env.NODE_ENV==='development'));
 if(process.env.NODE_ENV==='production')response.headers.set('Strict-Transport-Security','max-age=31536000; includeSubDomains');
 if(process.env.PUBLIC_INDEXING_ENABLED!=='true'||/^\/(?:account|admin|api|book|login|logout|signup|requests)(?:\/|$)/.test(url.pathname))response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
 response.headers.set('Cache-Control','private, no-store');return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|assets/).*)']};
