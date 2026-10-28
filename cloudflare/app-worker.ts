import handler from 'vinext/server/fetch-handler';
import {isIP} from 'node:net';
import {canReview,publicReviewPath} from '../lib/review-access';
import {withRequestSecurity} from '../lib/request-security';
import {contentSecurityPolicy} from '../lib/http-security';
import {purgeExpired} from '../lib/purge';
import {canonicalRequest} from '../lib/trusted-request';
import {passwordReady} from '../lib/password-settings';

function secure(request:Request,response:Response,env:Cloudflare.Env){
 const result=new Response(response.body,response);result.headers.set('Content-Security-Policy',contentSecurityPolicy(import.meta.env.DEV));result.headers.set('X-Content-Type-Options','nosniff');result.headers.set('X-Frame-Options','DENY');result.headers.set('Referrer-Policy','strict-origin-when-cross-origin');result.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
 if(!import.meta.env.DEV)result.headers.set('Strict-Transport-Security','max-age=31536000; includeSubDomains');
 if(env.PUBLIC_INDEXING_ENABLED!=='true'||/^\/(?:account|admin|api|book|login|logout|signup|requests)(?:\/|$)/.test(new URL(request.url).pathname))result.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
 result.headers.set('Cache-Control','private, no-store');return result;
}
export default {
 async fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){
  const url=new URL(request.url),canonical=new URL(env.APP_BASE_URL||'https://hiramshot.com');
  let response:Response;
  if(!import.meta.env.DEV&&![canonical.hostname,'www.'+canonical.hostname].includes(url.hostname))return secure(request,new Response('Not found',{status:404}),env);
  if(!import.meta.env.DEV&&url.origin!==canonical.origin)return secure(request,Response.redirect(new URL(url.pathname+url.search,canonical).toString(),308),env);
  if(env.REVIEW_MODE!=='false'&&!publicReviewPath(url.pathname)&&!await canReview(request,env.AUTH_SECRET,env.ADMIN_ACCESS_EMAILS||'',env.DB,passwordReady(env as unknown as Record<string,string|undefined>))){
   response=url.pathname.startsWith('/api/')?Response.json({error:'Owner review access required.'},{status:401}):Response.redirect(new URL('/login?return_to='+encodeURIComponent(url.pathname+url.search),url).toString(),303);
   return secure(request,response,env);
  }
  // Vinext emits CSS and browser modules here; serve them from the asset binding.
  if((url.pathname.startsWith('/assets/')||url.pathname.startsWith('/_next/static/'))&&env.ASSETS)return secure(request,await env.ASSETS.fetch(request),env);
  // Capture trusted edge metadata before the application proxy strips ingress headers.
  const ip=request.headers.get('cf-connecting-ip');
  response=await withRequestSecurity({ip:ip&&isIP(ip)?ip:import.meta.env.DEV?'127.0.0.1':'unavailable'},()=>handler.fetch(canonicalRequest(request),env,ctx));
  return secure(request,response,env);
 },
 async scheduled(_event:ScheduledController,env:Cloudflare.Env,ctx:ExecutionContext){ctx.waitUntil(purgeExpired(env));},
};
