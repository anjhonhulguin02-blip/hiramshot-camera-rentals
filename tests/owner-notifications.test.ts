import test from 'node:test';
import assert from 'node:assert/strict';
import {notificationFixture as fixture} from './notification-fixture';

import {deliverOwnerNotifications,notificationSettings,ownerNotificationMutation} from '../lib/owner-notifications';
import {ownerNotificationTarget} from '../lib/owner-notification-links';

test('database events notify new registrations, real rental requests and five-file review readiness without duplicates',async()=>{
 const f=fixture(),id=f.booking();f.booking(1);assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM owner_notifications WHERE kind='NEW_BOOKING'").get()?.n,1);
 const before=f.sqlite.prepare('SELECT COUNT(*) n FROM owner_notifications').get()?.n;assert.equal(before,2);f.documents(id);assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM owner_notifications WHERE kind='BOOKING_KYC_READY'").get()?.n,1);
 f.sqlite.prepare('UPDATE bookings SET personal=personal WHERE id=?').run(id);assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM owner_notifications WHERE kind='BOOKING_KYC_READY'").get()?.n,1);
 assert.equal((await deliverOwnerNotifications(f.env,Date.now()+2000)).sent,3);assert.equal((await deliverOwnerNotifications(f.env,Date.now()+3000)).sent,0);
 assert.ok(f.mail.every(message=>message.to==='owner@example.invalid'));assert.ok(f.mail.some(message=>String(message.subject).includes('New rental request')));assert.ok(f.mail.some(message=>String(message.subject).includes('ready for review')));
 const text=JSON.stringify(f.mail);for(const privateValue of ['never email private contact','never email encrypted KYC','kyc/synthetic-private-object','attachments','password_hash'])assert.ok(!text.includes(privateValue));assert.ok(text.includes('https://example.invalid/admin?booking='+id));f.close();
});
test('pre-booking account review waits for five safe files; invalidated cases do not send stale review alerts',async()=>{
 const f=fixture(),id=crypto.randomUUID();f.sqlite.prepare("INSERT INTO account_verifications(id,user_id,personal,status,expires_at,created_at,updated_at) VALUES (?,?,'encrypted','PENDING','2099-01-01','test','test')").run(id,f.client);
 assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM owner_notifications WHERE kind='ACCOUNT_KYC_READY'").get()?.n,0);f.documents(id,true);assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM owner_notifications WHERE kind='ACCOUNT_KYC_READY'").get()?.n,1);
 await deliverOwnerNotifications(f.env,Date.now()+2000);assert.ok(f.mail.some(message=>String(message.text).includes('/admin?verification='+id)));
 const b=f.booking();f.documents(b);f.sqlite.prepare("UPDATE bookings SET status='cancelled' WHERE id=?").run(b);const result=await deliverOwnerNotifications(f.env,Date.now()+3000);assert.equal(result.sent,0);assert.equal(result.skipped,2);f.close();
});
test('provider failures retry durably and simultaneous dispatchers cannot send a queued event twice',async()=>{
 const f=fixture();f.failure(true);const first=await deliverOwnerNotifications(f.env,f.now+2000);assert.equal(first.deferred,1);assert.equal(f.mail.length,0);const row=f.sqlite.prepare('SELECT * FROM owner_notifications').get();assert.equal(row?.status,'PENDING');assert.equal(row?.attempts,1);assert.equal(row?.last_error,'SEND_FAILED');assert.equal(f.sqlite.prepare('SELECT lease_until FROM owner_notification_dispatch').get()?.lease_until,0);
 f.failure(false);assert.equal((await deliverOwnerNotifications(f.env,f.now+3000)).sent,0);const results=await Promise.all([deliverOwnerNotifications(f.env,f.now+180000),deliverOwnerNotifications(f.env,f.now+180000)]);assert.equal(results.reduce((sum,result)=>sum+result.sent,0),1);assert.equal(f.mail.length,1);f.close();
});
test('daily send attempts are capped; retakes coalesce and respect a fifteen-minute review-alert cooldown',async()=>{
 const f=fixture();f.env.ADMIN_NOTIFICATION_DAILY_LIMIT='1';const b=f.booking();await deliverOwnerNotifications(f.env,f.now+2000);assert.equal(f.mail.length,1);await deliverOwnerNotifications(f.env,f.now+3000);assert.equal(f.mail.length,1);
 f.env.ADMIN_NOTIFICATION_DAILY_LIMIT='100';f.documents(b);await deliverOwnerNotifications(f.env,f.now+4000);const original=f.mail.length;
 for(let i=0;i<2;i++)f.sqlite.prepare("UPDATE kyc_documents SET id=? WHERE booking_id=? AND kind='government-id-1'").run(crypto.randomUUID(),b);
 await deliverOwnerNotifications(f.env,f.now+5000);assert.equal(f.mail.length,original);assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM owner_notifications WHERE kind='BOOKING_KYC_READY' AND status='PENDING'").get()?.n,1);
 await deliverOwnerNotifications(f.env,f.now+COOLDOWN+8000);assert.equal(f.mail.length,original+1);f.close();
});
const COOLDOWN=15*60000;
test('notification settings and admin links cannot be supplied as arbitrary email recipients or redirects',()=>{
 const f=fixture();for(const email of ['owner@example.invalid,evil@example.invalid','owner@example.invalid\r\nBcc: evil@example.invalid','x']){f.env.ADMIN_NOTIFICATION_EMAIL=email;assert.throws(()=>notificationSettings(f.env));}f.env.ADMIN_NOTIFICATIONS_ENABLED='false';assert.equal(notificationSettings(f.env),null);
 assert.deepEqual(ownerNotificationTarget('?tab=Clients'),{tab:'Clients'});assert.equal(ownerNotificationTarget('?booking=https://evil.invalid'),null);assert.equal(ownerNotificationTarget('?tab=Security%20log'),null);
 const request=new Request('https://example.invalid/api/bookings',{method:'POST'});assert.equal(ownerNotificationMutation(request,new Response('',{status:201})),true);assert.equal(ownerNotificationMutation(request,new Response('',{status:400})),false);assert.equal(ownerNotificationMutation(new Request('https://example.invalid/api/config'),new Response()),false);f.close();
});
