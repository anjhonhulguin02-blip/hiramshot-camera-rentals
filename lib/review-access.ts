import {getToken} from 'next-auth/jwt';
export function publicReviewPath(path:string){return /^\/(?:login(?:\/|$)|logout(?:\/|$)|api\/auth\/|assets\/|_next\/static\/|favicon\.ico$)/.test(path);}
export function reviewOwner(token:{principal?:unknown;email?:unknown}|null,emails:string){return !!(token&&typeof token.principal==='string'&&token.principal.startsWith('google:')&&typeof token.email==='string'&&emails.split(',').map(value=>value.trim().toLowerCase()).includes(token.email.toLowerCase()));}
export async function canReview(request:Request,secret:string|undefined,emails:string){if(!secret||secret.length<32)return false;try{const token=await getToken({req:request,secret,secureCookie:new URL(request.url).protocol==='https:'});return reviewOwner(token,emails);}catch{return false;}}
