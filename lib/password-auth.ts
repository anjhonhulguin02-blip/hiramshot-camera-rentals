import {env} from '@hiramshot/runtime';
import {after} from 'next/server';
import {ApiError,database} from './api';
import {abuseLimit,applyRequestLimit,verifyTurnstile} from './security';
import {getChatGPTUser} from '../app/chatgpt-auth';
import {passwordReady} from './password-settings';
import {normalizeLoginEmail,hashPassword,verifyPassword,newPasswordToken,passwordTokenHash} from './password-crypto';
import {CONSUME_PASSWORD_TOKEN_SQL,UPDATE_PASSWORD_SQL} from './password-sql';
type Credential={id:string;principal:string;email:string;full_name:string;password_hash:string|null;verified_at:string|null;session_version:number;created_at:string;updated_at:string};
export function passwordAuthReady(){return passwordReady(process.env,typeof env.AUTH_EMAIL?.send==='function');}
function requireReady(){if(!passwordAuthReady())throw new ApiError(503,'Email sign-in is being prepared. Please use Google for now.');try{if(normalizeLoginEmail(process.env.AUTH_EMAIL_FROM).split('@')[1]!==new URL(env.APP_BASE_URL||'https://hiramshot.com').hostname)throw 0;}catch{throw new ApiError(503,'Email sender verification is awaiting setup.');}}
export async function passwordSessionValid(token:{credentialId?:unknown;credentialVersion?:unknown;principal?:unknown}){
 if(!passwordAuthReady()||typeof token.credentialId!=='string'||typeof token.credentialVersion!=='number'||!env.DB)return false;
 const row=await env.DB.prepare('SELECT principal,session_version,verified_at,password_hash FROM password_credentials WHERE id=?').bind(token.credentialId).first<Credential>();
 return !!(row?.verified_at&&row.password_hash&&row.principal===token.principal&&row.session_version===token.credentialVersion);
}
export async function passwordSignIn(credentials:Partial<Record<string,unknown>>,request:Request){
 requireReady();let email;try{email=normalizeLoginEmail(credentials.email);}catch{return null;}
 if(request.headers.get('origin')!==new URL(request.url).origin)return null;
 await abuseLimit(request,email,'password-login');await verifyTurnstile(request,credentials.turnstileToken,'login');
 const row=await database().prepare('SELECT * FROM password_credentials WHERE email=?').bind(email).first<Credential>();
 // Unknown addresses still perform one expensive password verification.
 const dummy='scrypt$32768$8$3$00000000000000000000000000000000$'+'0'.repeat(128);
 const valid=await verifyPassword(credentials.password,row?.password_hash||dummy);
 if(!valid||!row?.verified_at||!row.password_hash)return null;
 const account=await database().prepare('SELECT account_status FROM users WHERE auth_user_id=?').bind(row.principal).first<{account_status:string}>();
 if(account&&account.account_status!=='ACTIVE')return null;
 return {id:row.principal,email:row.email,name:row.full_name,credentialId:row.id,credentialVersion:row.session_version};
}
async function sendPasswordEmail(email:string,token:string,purpose:'verify'|'reset'){
 const origin=new URL(env.APP_BASE_URL||'https://hiramshot.com');
 if(origin.protocol!=='https:'||origin.hostname!==(env.CUSTOM_DOMAIN||'hiramshot.com'))throw new ApiError(503,'Email delivery is awaiting setup.');
 const from=normalizeLoginEmail(process.env.AUTH_EMAIL_FROM);if(from.split('@')[1]!==origin.hostname)throw new ApiError(503,'Email sender verification is awaiting setup.');
 const link=new URL(purpose==='verify'?'/verify-email':'/reset-password',origin);link.hash='token='+token;
 if(process.env.AUTH_EMAIL_PROVIDER==='cloudflare'){if(!env.AUTH_EMAIL)throw new ApiError(503,'Secure email delivery is not configured.');try{const sent=await env.AUTH_EMAIL.send({from:{email:from,name:'HiramShot Camera Rentals'},to:email,replyTo:env.CONTACT_EMAIL,subject:purpose==='verify'?'Verify your HiramShot email':'Reset your HiramShot password',text:`You requested a secure HiramShot ${purpose==='verify'?'email verification':'password reset'} link.\n\n${link}\n\nThis link expires in ${purpose==='verify'?'30':'15'} minutes and works once. If you did not request it, ignore this email. Do not share this link or your password.`});if(!sent?.messageId)throw new Error();return;}catch{throw new ApiError(503,'Email delivery could not complete. Try again shortly.');}}
 const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:`HiramShot Camera Rentals <${from}>`,to:[email],reply_to:env.CONTACT_EMAIL,subject:purpose==='verify'?'Verify your HiramShot email':'Reset your HiramShot password',text:`You requested ${purpose==='verify'?'email verification and a password':'a password reset'} for HiramShot Camera Rentals.\n\nOpen this link to choose your password:\n${link}\n\nThis link expires in ${purpose==='verify'?'30':'15'} minutes and works once. If you did not request this, ignore this email. Do not share the link with anyone. HiramShot will never ask you to send your password or reset link.`})});
 if(!response.ok)throw new ApiError(503,'Email delivery is temporarily unavailable. Please try again later.');
}
export async function requestPasswordEmail(request:Request,body:Record<string,unknown>){
 requireReady();let email;try{email=normalizeLoginEmail(body.email);}catch(error){throw new ApiError(400,(error as Error).message);}
 await applyRequestLimit(request,email,{scope:'password-email',limit:3,windowSeconds:3600});await verifyTurnstile(request,body.turnstileToken,'password_email');
 const mode=body.mode==='create'?'create':body.mode==='reset'?'reset':null;if(!mode)throw new ApiError(400,'Choose a valid account action.');
 const now=new Date().toISOString(),db=database();let row=await db.prepare('SELECT * FROM password_credentials WHERE email=?').bind(email).first<Credential>();
 if(mode==='create'){
  if(typeof body.name!=='string'||body.name.trim().length<2||body.name.trim().length>100||/[\u0000-\u001f]/.test(body.name)||body.privacyConsent!==true)throw new ApiError(400,'Enter your name and accept the privacy notice.');
  if(row?.verified_at)return;
  const existing=await db.prepare('SELECT auth_user_id FROM users WHERE email=?').bind(email).first<{auth_user_id:string|null}>();let principal='email:'+crypto.randomUUID();
  if(existing){const signedIn=await getChatGPTUser();if(!signedIn||signedIn.email.toLowerCase()!==email||(existing.auth_user_id&&existing.auth_user_id!==signedIn.userId))return;principal=signedIn.userId;if(row){await db.prepare('UPDATE password_credentials SET principal=?,full_name=?,session_version=session_version+1,updated_at=? WHERE id=? AND verified_at IS NULL').bind(principal,body.name.trim(),now,row.id).run();row=await db.prepare('SELECT * FROM password_credentials WHERE id=?').bind(row.id).first<Credential>();}}
  if(!row){const id=crypto.randomUUID();await db.prepare('INSERT OR IGNORE INTO password_credentials(id,principal,email,full_name,created_at,updated_at) VALUES (?,?,?,?,?,?)').bind(id,principal,email,body.name.trim(),now,now).run();row=await db.prepare('SELECT * FROM password_credentials WHERE email=?').bind(email).first<Credential>();}
 }
 if(!row||(mode==='reset'&&!row.verified_at))return;
 // Keep authentication mail below the included monthly allowance, with headroom for support.
 await applyRequestLimit(request,'hiramshot-auth-email',{scope:'auth-email-global',limit:90,windowSeconds:86400});
 const token=newPasswordToken(),hash=passwordTokenHash(token),purpose=mode==='create'?'verify':'reset';
 await db.prepare('INSERT INTO password_tokens(token_hash,credential_id,purpose,expected_version,expires_at) VALUES (?,?,?,?,?)').bind(hash,row.id,purpose,row.session_version,Date.now()+(purpose==='verify'?30:15)*60000).run();
 // Delivery happens after the generic response; provider latency must not reveal account existence.
 after(async()=>{try{await sendPasswordEmail(email,token,purpose);}catch{await db.prepare('DELETE FROM password_tokens WHERE token_hash=?').bind(hash).run();console.error('Authentication email delivery failed.');}});
 await db.prepare('DELETE FROM password_tokens WHERE token_hash IN (SELECT token_hash FROM password_tokens WHERE expires_at<? LIMIT 100)').bind(Date.now()).run();
}
export async function completePassword(request:Request,body:Record<string,unknown>){
 requireReady();
 let hash;try{hash=passwordTokenHash(body.token);}catch(error){throw new ApiError(400,(error as Error).message);}
 await abuseLimit(request,hash,'password-completion');await verifyTurnstile(request,body.turnstileToken,'password_complete');
 const purpose=body.purpose==='verify'?'verify':body.purpose==='reset'?'reset':null;if(!purpose)throw new ApiError(400,'Invalid account action.');
 const db=database(),nowMs=Date.now();const token=await db.prepare('SELECT * FROM password_tokens WHERE token_hash=? AND purpose=? AND used_nonce IS NULL AND expires_at>?').bind(hash,purpose,nowMs).first<{credential_id:string;expected_version:number}>();
 if(!token)throw new ApiError(400,'This link is invalid or expired. Request a new email.');
 const credential=await db.prepare('SELECT * FROM password_credentials WHERE id=?').bind(token.credential_id).first<Credential>();if(!credential||credential.session_version!==token.expected_version)throw new ApiError(400,'This link is invalid or expired. Request a new email.');
 const profile=await db.prepare('SELECT auth_user_id FROM users WHERE email=?').bind(credential.email).first<{auth_user_id:string|null}>();if(profile?.auth_user_id&&profile.auth_user_id!==credential.principal)throw new ApiError(400,'Sign in with your original account, then request password setup again.');
 if(body.password!==body.confirmPassword)throw new ApiError(400,'Your passwords do not match.');let passwordHash;try{passwordHash=await hashPassword(body.password);}catch(error){throw new ApiError(400,(error as Error).message);}
 const consumeTime=Date.now(),nonce=crypto.randomUUID(),now=new Date(consumeTime).toISOString();const results=await db.batch([db.prepare(CONSUME_PASSWORD_TOKEN_SQL).bind(nonce,hash,purpose,consumeTime),db.prepare(UPDATE_PASSWORD_SQL).bind(passwordHash,now,now,credential.id,token.expected_version,hash,nonce)]);
 if(results[0].meta.changes!==1||results[1].meta.changes!==1)throw new ApiError(400,'This link is invalid or already used. Request a new email.');
}
