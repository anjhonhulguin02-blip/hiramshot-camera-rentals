import {contactEmail} from './site';
import { totp } from './totp';
export { totp } from './totp';
import { env } from 'cloudflare:workers';
import { ApiError, database, identity } from './api';
import { adminAllowed } from './rental';
import { ensureAccount } from './accounts';
const encoder = new TextEncoder();
export function base64(bytes: Uint8Array) { let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s); }
export function unbase64(s:string) { return Uint8Array.from(atob(s),c=>c.charCodeAt(0)); }
export async function digest(data: Uint8Array | string) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', typeof data==='string'?encoder.encode(data):data as BufferSource))].map(b=>b.toString(16).padStart(2,'0')).join(''); }
async function hmacKey(secret:string,algorithm='SHA-256') { return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:algorithm},false,['sign','verify']); }
export async function mac(text:string,secret:string) { return base64(new Uint8Array(await crypto.subtle.sign('HMAC',await hmacKey(secret),encoder.encode(text)))); }
export async function verifyMac(text:string,signature:string,secret:string) { try{return await crypto.subtle.verify('HMAC',await hmacKey(secret),unbase64(signature),encoder.encode(text));}catch{return false;} }
export function requireSecret(value:string|undefined,name:string) { if(!value||value.length<32)throw new ApiError(503,`${name} is not configured. Contact HiramShot.`);return value; }
async function dataKey() { let bytes;try{bytes=unbase64(env.DATA_ENCRYPTION_KEY??'');}catch{}if(!bytes||bytes.length!==32)throw new ApiError(503,'Private data storage is not configured.');return crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']); }
export async function encrypt(value:unknown) { const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},await dataKey(),encoder.encode(JSON.stringify(value)));return `v1.${base64(iv)}.${base64(new Uint8Array(data))}`; }
export async function decrypt<T=Record<string,string>>(value:string):Promise<T> { const [v,iv,data]=value.split('.');if(v!=='v1')throw new Error('Unsupported encryption envelope');return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64(iv)},await dataKey(),unbase64(data)))); }
export function clientIp(request:Request) { return request.headers.get('cf-connecting-ip') ?? (import.meta.env.DEV?'127.0.0.1':'unavailable'); }
export async function eligibleAdmin(user:import('../app/chatgpt-auth').ChatGPTUser) { const account = await ensureAccount(user); return account.account_status === 'ACTIVE' && ['ADMIN','STAFF'].includes(account.role); }
const COOKIE='__Host-hiramshot-admin';
export async function requireStaff(request:Request) {
  const user=await identity();if(!await eligibleAdmin(user))throw new ApiError(403,'Operator access required.');
  const secret=requireSecret(env.ADMIN_SESSION_SECRET,'Admin session protection');
  const cookie=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  try { const [payload,signature]=decodeURIComponent(cookie??'').split('~');if(!await verifyMac(payload,signature,secret))throw 0;const data=JSON.parse(new TextDecoder().decode(unbase64(payload)));if(data.uid!==user.userId||data.exp<Date.now())throw 0; }catch{throw new ApiError(403,'Complete administrator two-factor verification.');}
  return user;
}
export async function requireAdmin(request:Request) { const user=await requireStaff(request); if((await ensureAccount(user)).role!=='ADMIN')throw new ApiError(403,'Administrator access required.'); return user; }
export async function openAdminSession(request:Request,code:unknown) {
  const user=await identity();if(!await eligibleAdmin(user))throw new ApiError(403,'Operator access required.');await abuseLimit(request,user.userId,'mfa');
  const factor=await adminFactor(user.userId);if(!factor)throw new ApiError(503,'Administrator MFA is not enrolled.');
  if(typeof code!=='string'||!/^\d{6}$/.test(code))throw new ApiError(400,'Enter the six-digit authenticator code.');
  const counter=Math.floor(Date.now()/30000);let matched:number|null=null;
  for(const c of [counter-1,counter,counter+1]){const expected=await totp(factor,c);if(await digest(code)===await digest(expected))matched=c;}
  if(matched===null)throw new ApiError(403,'Invalid or expired authenticator code.');
  try{await database().prepare('INSERT INTO mfa_used (key,expires_at) VALUES (?,?)').bind(`${user.userId}:${matched}`,Date.now()+120000).run();}catch{throw new ApiError(403,'This authenticator code was already used. Wait for the next code.');}
  await database().prepare('DELETE FROM mfa_used WHERE expires_at<?').bind(Date.now()).run();
  const payload=base64(encoder.encode(JSON.stringify({uid:user.userId,exp:Date.now()+15*60000,nonce:crypto.randomUUID()}))),signature=await mac(payload,requireSecret(env.ADMIN_SESSION_SECRET,'Admin session protection'));
  await audit(request,user.userId,'','admin.session.open');
  return `${COOKIE}=${encodeURIComponent(payload+'~'+signature)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=900`;
}
export async function abuseLimit(request:Request,userId:string,scope:string) {
  const bucket=Math.floor(Date.now()/900000),secret=requireSecret(env.AUDIT_HMAC_KEY,'Security protection'),ip=await mac(clientIp(request),secret);
  for(const key of [`${scope}:ip:${ip}:${bucket}`,`${scope}:user:${userId}:${bucket}`]) { const result=await database().prepare('INSERT INTO request_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<5 RETURNING count').bind(key,(bucket+1)*900).first();if(!result)throw new ApiError(429,'Too many attempts. Please wait 15 minutes before trying again.'); }
}
export async function verifyTurnstile(request:Request,token:unknown,action:string) {
  if(!env.TURNSTILE_SECRET_KEY||!env.TURNSTILE_SITE_KEY)throw new ApiError(503,`Spam protection is not configured. Contact ${contactEmail()} to arrange your rental.`);
  if(typeof token!=='string'||!token||token.length>2048)throw new ApiError(400,'Complete the security challenge.');
  const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:token,remoteip:clientIp(request)==='unavailable'?undefined:clientIp(request)})});
  const data=await r.json() as {success:boolean;hostname:string;action:string};
  if(!data.success||data.hostname!==new URL(request.url).hostname||data.action!==action)throw new ApiError(403,'Security challenge expired or failed. Please try again.');
}
export async function audit(request:Request,actor:string,bookingId:string,action:string) {
  const id=crypto.randomUUID(),ip=clientIp(request),createdAt=new Date().toISOString(),secret=requireSecret(env.AUDIT_HMAC_KEY,'Audit protection');
  const signature=await mac(JSON.stringify({id,actor,ip,bookingId,action,createdAt}),secret);
  await database().prepare('INSERT INTO security_events (id,actor,ip,booking_id,action,created_at,mac) VALUES (?,?,?,?,?,?,?)').bind(id,actor,ip,bookingId,action,createdAt,signature).run();
}
export function kycReady(){return env.KYC_ENABLED==='true'&&!!env.BUCKET&&!!env.DATA_ENCRYPTION_KEY&&!!env.ADMIN_SESSION_SECRET&&!!env.MALWARE_SCANNER_URL&&!!env.MALWARE_SCANNER_TOKEN&&!!env.TURNSTILE_SITE_KEY&&!!env.TURNSTILE_SECRET_KEY;}
export async function adminFactor(userId:string){if(env.ADMIN_TOTP_SECRET)return env.ADMIN_TOTP_SECRET;const row=await database().prepare('SELECT secret FROM admin_mfa WHERE user_id=? AND enabled=1').bind(userId).first<{secret:string}>();return row?(await decrypt<{secret:string}>(row.secret)).secret:null;}
export function randomBase32(){const bytes=crypto.getRandomValues(new Uint8Array(20));let bits='',result='';for(const b of bytes)bits+=b.toString(2).padStart(8,'0');for(let i=0;i<bits.length;i+=5)result+='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[parseInt(bits.slice(i,i+5),2)];return result;}
