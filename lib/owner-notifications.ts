import {validateGovernmentIdPair} from './id-document';
import {CLEAN_KYC_PREDICATE} from './verification';

type Notification={event_key:string;kind:string;entity_id:string;status:string;attempts:number;created_at:number;next_attempt_at:number};
const LEASE=120000,COOLDOWN=15*60000;
export function notificationSettings(env:Cloudflare.Env){
 if(env.ADMIN_NOTIFICATIONS_ENABLED!=='true')return null;
 const recipient=(env.ADMIN_NOTIFICATION_EMAIL||'').trim().toLowerCase(),sender=(env.AUTH_EMAIL_FROM||'').trim().toLowerCase(),origin=new URL(env.APP_BASE_URL||'https://hiramshot.com');
 if(!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(recipient)||recipient.length>254||origin.protocol!=='https:'||origin.username||origin.password||origin.port||origin.hostname!==(env.CUSTOM_DOMAIN||'hiramshot.com')||!sender.endsWith('@'+origin.hostname)||/[\r\n,;<>]/.test(sender)||!env.AUTH_EMAIL?.send)throw new Error('Owner notification configuration is incomplete');
 const raw=Number(env.ADMIN_NOTIFICATION_DAILY_LIMIT||100);if(!Number.isSafeInteger(raw)||raw<1||raw>1000)throw new Error('Invalid owner email daily limit');
 return {recipient,sender,origin:origin.origin,limit:raw};
}
function clean(value:unknown){return String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,120).trim();}
async function messageFor(db:D1Database,row:Notification,origin:string,now:number){
 const link=new URL('/admin',origin);let subject='',body='';
 if(row.kind==='TEST')return {subject:'[HiramShot TEST] Owner notifications are connected',text:`Test notification only. No client rental or identity approval was created.\n\nNew rental requests, new client registrations and complete verification requirements will notify this inbox.\n\nOpen the secure rental desk: ${link.href}\n\nPrivate IDs and billing documents are never attached to these emails.`};
 if(row.kind==='NEW_CLIENT'){
  const client=await db.prepare("SELECT full_name FROM users WHERE id=? AND role='CLIENT' AND account_status='ACTIVE' AND is_demo=0 AND auth_user_id IS NOT NULL").bind(row.entity_id).first<{full_name:string}>();if(!client)return null;
  link.searchParams.set('tab','Clients');subject='[HiramShot] New client registration';body=`May bagong client registration.\n\nClient: ${clean(client.full_name)}\nReference: ${row.entity_id}\n\nRegistration is separate from identity approval. Review their requirements and complete the live video call before approving verification.`;
 }else if(row.kind==='NEW_BOOKING'||row.kind==='BOOKING_KYC_READY'){
  const booking=await db.prepare("SELECT b.*,u.full_name FROM bookings b JOIN users u ON u.id=b.client_id WHERE b.id=? AND b.is_demo=0 AND u.is_demo=0 AND u.account_status='ACTIVE' AND b.status NOT IN ('cancelled','returned','cleared') AND b.purged_at IS NULL AND (b.purge_at IS NULL OR b.purge_at>?)").bind(row.entity_id,new Date(now).toISOString()).first<{id:string;full_name:string;booking_reference_code:string|null;status:string;personal:string|null;verified_at:string|null;start_date:string;end_date:string}>();if(!booking)return null;
  if(row.kind==='BOOKING_KYC_READY'&&(!booking.personal||booking.verified_at||!['requested','verification','reserved'].includes(booking.status)||!await complete(db,'kyc_documents','booking_id',row.entity_id)))return null;
  link.searchParams.set('booking',booking.id);subject=row.kind==='NEW_BOOKING'?'[HiramShot] New rental request':'[HiramShot] Rental verification ready for review';body=`${row.kind==='NEW_BOOKING'?'May bagong rental request.':'Kumpleto na ang limang verification requirements para sa rental review.'}\n\nClient: ${clean(booking.full_name)}\nBooking: ${clean(booking.booking_reference_code)||booking.id}\nRental dates: ${clean(booking.start_date)} to ${clean(booking.end_date)}\n\n${row.kind==='NEW_BOOKING'?'Review availability, verification and downpayment in the rental desk. This request is not a confirmed reservation.':'Review the private documents and complete the Messenger physical-ID call before approval. File receipt does not prove that an ID is genuine.'}`;
 }else if(row.kind==='ACCOUNT_KYC_READY'){
  const verification=await db.prepare("SELECT v.id,u.full_name FROM account_verifications v JOIN users u ON u.id=v.user_id WHERE v.id=? AND v.status='PENDING' AND v.personal IS NOT NULL AND v.expires_at>? AND u.account_status='ACTIVE' AND u.is_demo=0").bind(row.entity_id,new Date(now).toISOString()).first<{id:string;full_name:string}>();if(!verification||!await complete(db,'account_verification_documents','verification_id',row.entity_id))return null;
  link.searchParams.set('verification',verification.id);subject='[HiramShot] Account verification ready for approval';body=`Kumpleto na ang limang requirements ng client at naghihintay ng identity review.\n\nClient: ${clean(verification.full_name)}\nVerification reference: ${verification.id}\n\nReview the private documents and complete the Messenger physical-ID call before approval. File receipt does not prove that an ID is genuine.`;
 }else return null;
 return {subject,text:`${body}\n\nReview securely: ${link.href}\n\nSign in with an authorized admin account and your authenticator code. No IDs, bills, selfies, passwords or private download links are included in this email.`};
}
async function complete(db:D1Database,table:string,parent:string,id:string){
 const docs=await db.prepare(`SELECT kind,id_type FROM ${table} WHERE ${parent}=? AND ${CLEAN_KYC_PREDICATE}`).bind(id).all<{kind:string;id_type:string|null}>();if(docs.results.length!==5)return false;try{validateGovernmentIdPair(docs.results);return true;}catch{return false;}
}
export async function deliverOwnerNotifications(env:Cloudflare.Env,now=Date.now()){
 const settings=notificationSettings(env),result={sent:0,skipped:0,deferred:0};if(!settings)return result;if(!env.DB)throw new Error('Notification database is unavailable');
 const db=env.DB,token=crypto.randomUUID(),day=new Date(now).toISOString().slice(0,10);
 await db.prepare("INSERT INTO owner_notification_dispatch(id) VALUES ('owner') ON CONFLICT(id) DO NOTHING").run();
 const acquired=await db.prepare("UPDATE owner_notification_dispatch SET lease_token=?,lease_until=? WHERE id='owner' AND lease_until<=?").bind(token,now+LEASE,now).run();if(!acquired.meta.changes)return result;
 try{
  await db.prepare("UPDATE owner_notifications SET status='PENDING',lease_token=NULL,lease_until=0,last_error='INTERRUPTED_DELIVERY' WHERE status='SENDING' AND lease_until<=?").bind(now).run();
  await db.prepare("UPDATE owner_notifications SET status='FAILED',last_error='RETRY_LIMIT' WHERE status='PENDING' AND (attempts>=8 OR created_at<?)").bind(now-86400000).run();
 const rows=await db.prepare("SELECT * FROM owner_notifications WHERE status='PENDING' AND next_attempt_at<=? ORDER BY created_at,rowid LIMIT 15").bind(now).all<Notification>();let attempted=0;
  for(const row of rows.results){
   if(attempted>=3)break;
   const newer=await db.prepare("SELECT event_key FROM owner_notifications WHERE kind=? AND entity_id=? AND status='PENDING' ORDER BY created_at DESC,rowid DESC LIMIT 1").bind(row.kind,row.entity_id).first<{event_key:string}>();
   if(newer?.event_key!==row.event_key){await db.prepare("UPDATE owner_notifications SET status='SKIPPED',last_error='SUPERSEDED' WHERE event_key=? AND status='PENDING'").bind(row.event_key).run();result.skipped++;continue;}
   const recent=await db.prepare("SELECT MAX(sent_at) AS sent_at FROM owner_notifications WHERE kind=? AND entity_id=? AND status='SENT'").bind(row.kind,row.entity_id).first<{sent_at:number|null}>();
   if(recent?.sent_at&&recent.sent_at+COOLDOWN>now){await db.prepare('UPDATE owner_notifications SET next_attempt_at=? WHERE event_key=?').bind(recent.sent_at+COOLDOWN,row.event_key).run();result.deferred++;continue;}
   const message=await messageFor(db,row,settings.origin,now);if(!message){await db.prepare("UPDATE owner_notifications SET status='SKIPPED',last_error='NO_LONGER_ACTIONABLE' WHERE event_key=? AND status='PENDING'").bind(row.event_key).run();result.skipped++;continue;}
   const claim=await db.batch([
    db.prepare("UPDATE owner_notifications SET status='SENDING',lease_token=?,lease_until=?,attempts=attempts+1 WHERE event_key=? AND status='PENDING' AND EXISTS(SELECT 1 FROM owner_notification_dispatch WHERE id='owner' AND lease_token=? AND lease_until>? AND (day<>? OR attempts_today<?))").bind(token,now+LEASE,row.event_key,token,now,day,settings.limit),
    db.prepare("UPDATE owner_notification_dispatch SET day=?,attempts_today=CASE WHEN day=? THEN attempts_today+1 ELSE 1 END WHERE id='owner' AND lease_token=? AND EXISTS(SELECT 1 FROM owner_notifications WHERE event_key=? AND status='SENDING' AND lease_token=?)").bind(day,day,token,row.event_key,token),
   ]);if(!claim[0].meta.changes){result.deferred++;break;}
   attempted++;let messageId:string;
   try{const response=await env.AUTH_EMAIL!.send({from:{email:settings.sender,name:'HiramShot Camera Rentals'},to:settings.recipient,subject:message.subject,text:message.text});if(typeof response?.messageId!=='string'||!response.messageId||response.messageId.length>200)throw new Error('Missing mail receipt');messageId=response.messageId;}
   catch{const attempts=row.attempts+1;await db.prepare("UPDATE owner_notifications SET status=?,lease_token=NULL,lease_until=0,next_attempt_at=?,last_error='SEND_FAILED' WHERE event_key=? AND status='SENDING' AND lease_token=?").bind(attempts>=8?'FAILED':'PENDING',now+Math.min(3600000,60000*2**attempts),row.event_key,token).run();result.deferred++;continue;}
   // After provider acceptance, a failed state write remains SENDING and recovers
   // after the lease. Delivery is at least once; an uncertain handoff can duplicate.
   await db.prepare("UPDATE owner_notifications SET status='SENT',sent_at=?,message_id=?,lease_token=NULL,lease_until=0,last_error=NULL WHERE event_key=? AND status='SENDING' AND lease_token=?").bind(now,messageId,row.event_key,token).run();result.sent++;
  }
  await db.prepare("DELETE FROM owner_notifications WHERE status IN ('SENT','SKIPPED') AND created_at<?").bind(now-30*86400000).run();
  return result;
 }finally{await db.prepare("UPDATE owner_notification_dispatch SET lease_token=NULL,lease_until=0 WHERE id='owner' AND lease_token=?").bind(token).run();}
}
export function ownerNotificationMutation(request:Request,response:Response){return response.ok&&['POST','PATCH'].includes(request.method)&&/^\/api\/(?:bookings(?:\/[a-f\d-]{36}(?:\/documents)?)?|account\/(?:register|verification(?:\/documents)?))$/.test(new URL(request.url).pathname);}
