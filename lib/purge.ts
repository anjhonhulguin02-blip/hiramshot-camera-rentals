import type { BookingRow } from './booking';
export async function purgeExpired(env:Cloudflare.Env){
 if(!env.DB||!env.BUCKET)return {purged:0};
 const now=new Date().toISOString(),rows=await env.DB.prepare('SELECT * FROM bookings WHERE purge_at IS NOT NULL AND purge_at<=? AND purged_at IS NULL LIMIT 50').bind(now).all<BookingRow>();let count=0;
 const enc=new TextEncoder();
 async function log(bookingId:string,action:string){if(!env.AUDIT_HMAC_KEY)throw new Error('Audit protection is not configured');const id=crypto.randomUUID(),actor='system:retention',ip='scheduled',createdAt=now,key=await crypto.subtle.importKey('raw',enc.encode(env.AUDIT_HMAC_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']),bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(JSON.stringify({id,actor,ip,bookingId,action,createdAt}))));let raw='';for(const b of bytes)raw+=String.fromCharCode(b);await env.DB!.prepare('INSERT INTO security_events(id,actor,ip,booking_id,action,created_at,mac) VALUES (?,?,?,?,?,?,?)').bind(id,actor,ip,bookingId,action,createdAt,btoa(raw)).run();}
 for(const row of rows.results){
  const docs=await env.DB.prepare('SELECT id,object_key FROM kyc_documents WHERE booking_id=? AND deleted_at IS NULL').bind(row.id).all<{id:string;object_key:string}>();
  for(const doc of docs.results){await log(row.id,'kyc.retention.delete:'+doc.id);await env.BUCKET.delete(doc.object_key);await env.DB.prepare('UPDATE kyc_documents SET deleted_at=? WHERE id=?').bind(now,doc.id).run();}
  if(!env.DATA_ENCRYPTION_KEY)throw new Error('Data encryption is not configured');const rawKey=Uint8Array.from(atob(env.DATA_ENCRYPTION_KEY),c=>c.charCodeAt(0)),key=await crypto.subtle.importKey('raw',rawKey,'AES-GCM',false,['encrypt']),iv=crypto.getRandomValues(new Uint8Array(12)),scrubbed=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(JSON.stringify({name:'Former renter',email:'',phone:''}))));let ivText='',cipherText='';for(const b of iv)ivText+=String.fromCharCode(b);for(const b of scrubbed)cipherText+=String.fromCharCode(b);const contact=`v1.${btoa(ivText)}.${btoa(cipherText)}`;
  await log(row.id,'booking.personal-data.purge');await env.DB.prepare('UPDATE bookings SET personal=NULL,contact=?,purged_at=?,updated_at=? WHERE id=?').bind(contact,now,now,row.id).run();count++;
 }
 await env.DB.prepare('DELETE FROM request_limits WHERE expires_at<?').bind(Math.floor(Date.now()/1000)-86400).run();return {purged:count};
}
