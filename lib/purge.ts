import type { BookingRow } from './booking';
export async function purgeExpired(env:Cloudflare.Env){
 if(!env.DB||!env.BUCKET)return {purged:0};
 const now=new Date().toISOString(),rows=await env.DB.prepare('SELECT * FROM bookings WHERE purge_at IS NOT NULL AND purge_at<=? AND purged_at IS NULL LIMIT 50').bind(now).all<BookingRow>();let count=0;
 const enc=new TextEncoder();
 async function log(bookingId:string,action:string){if(!env.AUDIT_HMAC_KEY)throw new Error('Audit protection is not configured');const id=crypto.randomUUID(),actor='system:retention',ip='scheduled',createdAt=now,key=await crypto.subtle.importKey('raw',enc.encode(env.AUDIT_HMAC_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']),bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(JSON.stringify({id,actor,ip,bookingId,action,createdAt}))));let raw='';for(const b of bytes)raw+=String.fromCharCode(b);await env.DB!.prepare('INSERT INTO security_events(id,actor,ip,booking_id,action,created_at,mac) VALUES (?,?,?,?,?,?,?)').bind(id,actor,ip,bookingId,action,createdAt,btoa(raw)).run();}
 const cleanup=await env.DB.prepare("SELECT object_key FROM kyc_object_cleanup c WHERE NOT EXISTS(SELECT 1 FROM kyc_documents d WHERE d.object_key=c.object_key AND d.deleted_at IS NULL) AND NOT EXISTS(SELECT 1 FROM account_verification_documents d WHERE d.object_key=c.object_key AND d.deleted_at IS NULL) LIMIT 100").all<{object_key:string}>();
 for(const object of cleanup.results){if(!/^kyc\/[a-f\d-]{36}$/i.test(object.object_key))continue;await log('','kyc.replaced-object.delete:'+object.object_key.slice(4));await env.BUCKET.delete(object.object_key);await env.DB.prepare('DELETE FROM kyc_object_cleanup WHERE object_key=?').bind(object.object_key).run();}
 for(const row of rows.results){
  const docs=await env.DB.prepare('SELECT id,object_key FROM kyc_documents WHERE booking_id=? AND deleted_at IS NULL').bind(row.id).all<{id:string;object_key:string}>();
  for(const doc of docs.results){await log(row.id,'kyc.retention.delete:'+doc.id);await env.BUCKET.delete(doc.object_key);await env.DB.prepare('UPDATE kyc_documents SET deleted_at=? WHERE id=?').bind(now,doc.id).run();}
  if(!env.DATA_ENCRYPTION_KEY)throw new Error('Data encryption is not configured');const rawKey=Uint8Array.from(atob(env.DATA_ENCRYPTION_KEY),c=>c.charCodeAt(0)),key=await crypto.subtle.importKey('raw',rawKey,'AES-GCM',false,['encrypt']),iv=crypto.getRandomValues(new Uint8Array(12)),scrubbed=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(JSON.stringify({name:'Former renter',email:'',phone:''}))));let ivText='',cipherText='';for(const b of iv)ivText+=String.fromCharCode(b);for(const b of scrubbed)cipherText+=String.fromCharCode(b);const contact=`v1.${btoa(ivText)}.${btoa(cipherText)}`;
  await log(row.id,'booking.personal-data.purge');await env.DB.prepare('UPDATE bookings SET personal=NULL,contact=?,purged_at=?,updated_at=? WHERE id=?').bind(contact,now,now,row.id).run();count++;
 }
 // Unlinked requirements have their own bounded seven-day lifetime. Claim before
 // object deletion so uploads, approval and booking transfer cannot race a purge.
 const pending=await env.DB.prepare("SELECT id,user_id,verified_at FROM account_verifications WHERE expires_at<=? AND status IN ('PENDING','APPROVED','PURGING') LIMIT 50").bind(now).all<{id:string;user_id:string;verified_at:string|null}>();let accountCount=0;
 for(const row of pending.results){
  const claimed=await env.DB.prepare("UPDATE account_verifications SET status='PURGING',version=version+1,updated_at=? WHERE id=? AND expires_at<=? AND status IN ('PENDING','APPROVED','PURGING')").bind(now,row.id,now).run();if(!claimed.meta.changes)continue;
  const docs=await env.DB.prepare('SELECT id,object_key FROM account_verification_documents WHERE verification_id=? AND deleted_at IS NULL').bind(row.id).all<{id:string;object_key:string}>();
  for(const doc of docs.results){await log('','account-verification.retention.delete:'+row.id+':'+doc.id);await env.BUCKET.delete(doc.object_key);await env.DB.prepare("UPDATE account_verification_documents SET deleted_at=?,scan_status='PURGED' WHERE id=?").bind(now,doc.id).run();}
  await log('','account-verification.personal-data.purge:'+row.id);
  await env.DB.prepare("UPDATE account_verifications SET personal=NULL,status='PURGED',purged_at=?,updated_at=? WHERE id=? AND status='PURGING'").bind(now,now,row.id).run();
  if(row.verified_at)await env.DB.prepare("UPDATE users SET kyc_status=CASE WHEN EXISTS(SELECT 1 FROM account_verifications WHERE user_id=users.id AND status='PENDING' AND expires_at>?) THEN 'PENDING_REVIEW' ELSE 'UNVERIFIED' END,video_call_verified=0,updated_at=? WHERE id=? AND NOT EXISTS(SELECT 1 FROM account_verifications WHERE user_id=users.id AND status='APPROVED' AND expires_at>?) AND NOT EXISTS(SELECT 1 FROM bookings WHERE client_id=users.id AND status IN ('verified','reserved','signed','out') AND verified_at IS NOT NULL)").bind(now,now,row.user_id,now).run();
  accountCount++;
 }
 await env.DB.prepare('DELETE FROM request_limits WHERE expires_at<?').bind(Math.floor(Date.now()/1000)-86400).run();return {purged:count,accountVerificationsPurged:accountCount};
}
