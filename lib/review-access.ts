import {getToken} from 'next-auth/jwt';
import {isRentalPrincipal} from './identity/navigation';
type ReviewToken={principal?:unknown;email?:unknown;authMethod?:unknown;emailVerified?:unknown;credentialId?:unknown;credentialVersion?:unknown};
export function publicReviewPath(path:string){return /^\/(?:login(?:\/|$)|logout(?:\/|$)|(?:review-access|forgot-password|create-account|reset-password|verify-email)\/?$|api\/password\/(?:request|complete)$|api\/auth\/|assets\/|_next\/static\/|favicon\.ico$)/.test(path);}
export function reviewOwner(token:ReviewToken|null,emails:string){return !!(token&&isRentalPrincipal(token.principal)&&(token.principal.startsWith('google:')||(token.authMethod==='password'&&token.emailVerified===true))&&typeof token.email==='string'&&emails.split(',').map(value=>value.trim().toLowerCase()).includes(token.email.toLowerCase()));}
export async function reviewDecision(request:Request,secret:string|undefined,emails:string,db?:D1Database,passwordEnabled=false):Promise<'allowed'|'signin'|'review-only'>{
 if(!secret||secret.length<32)return 'signin';
 try{const token=await getToken({req:request,secret,secureCookie:new URL(request.url).protocol==='https:'});if(!token||!isRentalPrincipal(token.principal)||typeof token.email!=='string'||!(token.principal.startsWith('google:')||(token.authMethod==='password'&&token.emailVerified===true)))return 'signin';
  if(token.authMethod==='password'){if(!passwordEnabled||!db||typeof token.credentialId!=='string'||typeof token.credentialVersion!=='number')return 'signin';const row=await db.prepare('SELECT principal,session_version,verified_at FROM password_credentials WHERE id=?').bind(token.credentialId).first<{principal:string;session_version:number;verified_at:string|null}>();if(!row?.verified_at||row.principal!==token.principal||row.session_version!==token.credentialVersion)return 'signin';}
  return reviewOwner(token,emails)?'allowed':'review-only';
 }catch{return 'signin';}
}
export async function canReview(request:Request,secret:string|undefined,emails:string,db?:D1Database,passwordEnabled=false){return await reviewDecision(request,secret,emails,db,passwordEnabled)==='allowed';}
