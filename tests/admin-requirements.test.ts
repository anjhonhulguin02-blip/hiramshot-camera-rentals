import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateSync} from 'node:zlib';
import {notificationFixture} from './notification-fixture';
import {base64,mac,encrypt,decrypt} from '../lib/security';
import {getBooking} from '../lib/booking';
import {requireBookingApproval} from '../lib/booking-approval';
import {attachAccountVerification} from '../lib/account-verification';
import {INITIAL_CATALOG,calculateQuote} from '../lib/catalog';
import {recordPayment} from '../lib/ledger';
import {purgeExpired} from '../lib/purge';
import {POLICIES,POLICY_VERSION} from '../lib/policies';
import * as adminFiles from '../app/api/admin/bookings/[id]/documents/route';
import * as accountFiles from '../app/api/admin/verifications/[id]/documents/route';
import * as exception from '../app/api/admin/bookings/[id]/known-client-approval/route';
import * as booking from '../app/api/bookings/[id]/route';
import * as contract from '../app/api/bookings/[id]/contract/route';

const state=globalThis as unknown as {hiramshotTestEnv:any;hiramshotTestUser:any},origin='https://example.invalid';
const renter={userId:'synthetic-client',email:'client@example.invalid',fullName:'Synthetic Renter',displayName:'Synthetic Renter'},admin={userId:'synthetic-owner',email:'owner@example.invalid',fullName:'Synthetic Owner',displayName:'Synthetic Owner'};
const personal={fullName:'Synthetic Renter',mobile:'09170000001',emergencyName:'Synthetic Contact',emergencyRelationship:'Sibling',emergencyPhone:'09170000002'};
const pickup='2026-11-05T09:00:00+08:00',returned='2026-11-07T09:00:00+08:00';
const ctx=(id:string)=>({params:Promise.resolve({id})});
function request(path:string,body:unknown,session=''){return new Request(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:session},body:JSON.stringify(body)});}
async function cookie(){const payload=base64(new TextEncoder().encode(JSON.stringify({uid:admin.userId,exp:Date.now()+60000})));return '__Host-hiramshot-admin='+encodeURIComponent(payload+'~'+await mac(payload,state.hiramshotTestEnv.ADMIN_SESSION_SECRET));}
function png(value:number){
 function chunk(type:string,data:Buffer){const combined=Buffer.concat([Buffer.from(type),data]),head=Buffer.alloc(4),tail=Buffer.alloc(4);head.writeUInt32BE(data.length);let sum=0xffffffff;for(const byte of combined){sum^=byte;for(let bit=0;bit<8;bit++)sum=(sum>>>1)^((sum&1)?0xedb88320:0);}tail.writeUInt32BE((sum^0xffffffff)>>>0);return Buffer.concat([head,combined,tail]);}
 const header=Buffer.from([0,0,3,32,0,0,2,88,8,2,0,0,0]),pixels=Buffer.alloc(600*(1+800*3));for(let row=0;row<600;row++)pixels.fill(value,row*2401+1,(row+1)*2401);
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
}
async function setup(){
 const f=notificationFixture(),objects=new Map<string,Uint8Array>();let infected=false;
 Object.assign(state.hiramshotTestEnv,f.env,{KYC_ENABLED:'true',TURNSTILE_SITE_KEY:'synthetic-site',TURNSTILE_SECRET_KEY:'synthetic-secret',BUCKET:{async put(key:string,bytes:Uint8Array){objects.set(key,new Uint8Array(bytes));},async delete(key:string){objects.delete(key);}},DATA_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64'),ADMIN_SESSION_SECRET:'synthetic-session-'.repeat(3),AUDIT_HMAC_KEY:'synthetic-audit-'.repeat(3),ADMIN_ACCESS_EMAILS:admin.email,MALWARE_SCANNER_TOKEN:'synthetic-private-scanner-'.repeat(3),MALWARE_SCANNER:{async fetch(req:Request){const bytes=await req.arrayBuffer(),sha256=Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');return Response.json({clean:!infected,sha256},{status:infected?422:200});}}});
 f.sqlite.prepare("INSERT INTO users(id,auth_user_id,role,full_name,email,created_at,updated_at) VALUES ('owner',?,'ADMIN',?,?,'test','test')").run(admin.userId,admin.fullName,admin.email);
 state.hiramshotTestUser=admin;
 async function create(){const id=f.booking(),items=[{equipmentId:'x5',variant:'Standard',addons:[]}],quote=calculateQuote(INITIAL_CATALOG,items,2);f.sqlite.prepare('UPDATE bookings SET personal=?,contact=?,items=?,quote=?,days=2,booking_reference_code=?,pickup_datetime=?,return_datetime=?,start_date=?,end_date=?,total_rental_fee_centavos=?,security_deposit_centavos=?,required_reservation_centavos=? WHERE id=?').run(await encrypt(personal),await encrypt({name:renter.fullName,email:renter.email,phone:personal.mobile}),JSON.stringify(items),JSON.stringify(quote),'HSR-TEST-'+id.slice(0,8),pickup,returned,'2026-11-05','2026-11-07',quote.totalMax!*100,quote.depositMax*100,quote.reservationMax!*100,id);return id;}
 return {...f,objects,create,infected(value:boolean){infected=value;}};
}
async function send(id:string,session:string,options:{account?:boolean;consent?:boolean;kind?:string;idType?:string;bytes?:Uint8Array;value?:number;external?:boolean}={}){
 const path=options.account?`/api/admin/verifications/${id}/documents`:`/api/admin/bookings/${id}/documents`,body=new FormData();body.set('kind',options.kind??'government-id-1');body.set('idType',options.idType??'drivers-license');body.set('captureSource','file');body.set('file',new File([options.bytes??png(options.value??1)],'synthetic.png',{type:'image/png'}));body.set('clientConsentConfirmed',String(options.consent!==false));
 const req=new Request(origin+path,{method:'POST',headers:{Origin:options.external?'https://untrusted.invalid':origin,Cookie:session},body});return options.account?accountFiles.POST(req,ctx(id)):adminFiles.POST(req,ctx(id));
}
async function approve(id:string,session:string,overrides:Record<string,unknown>={}){return exception.POST(request(`/api/admin/bookings/${id}/known-client-approval`,{reviewVersion:0,relationship:'RELATIVE',reason:'Known personally as a family relative.',confirmReference:'HSR-TEST-'+id.slice(0,8),personallyKnown:true,acceptResponsibility:true,...overrides},session),ctx(id));}

test('admin uploads require same-origin requests, administrator MFA, consent and the normal file-safety checks',async()=>{
 const f=await setup();try{const id=await f.create(),session=await cookie();
  assert.equal((await send(id,'')).status,403);state.hiramshotTestUser=renter;assert.equal((await send(id,session)).status,403);state.hiramshotTestUser=admin;
  assert.equal((await send(id,session,{external:true})).status,403);assert.equal((await send(id,session,{consent:false})).status,400);assert.equal(f.objects.size,0);
  f.infected(true);assert.equal((await send(id,session)).status,400);assert.equal(f.objects.size,0);f.infected(false);
  assert.equal((await send(id,session,{bytes:new Uint8Array(10485761)})).status,413);assert.equal(f.objects.size,0);
  const response=await send(id,session);assert.equal(response.status,201,await response.clone().text());const row=f.sqlite.prepare('SELECT * FROM kyc_documents').get();assert.equal(row?.submitted_by,'owner');assert.equal(row?.submission_source,'ADMIN_MESSENGER');assert.equal(row?.scan_status,'CLEAN');assert.equal(row?.reviewed_at,null);assert.equal(f.objects.size,1);
  assert.equal((await send(id,session,{kind:'government-id-2',value:2})).status,409);assert.equal((await send(id,session,{kind:'government-id-2',idType:'passport',value:1})).status,409);
  assert.equal((await send(id,session,{kind:'government-id-2',idType:'passport',value:2})).status,201);
  const v=f.sqlite.prepare('SELECT kyc_version FROM bookings WHERE id=?').get(id)?.kyc_version;assert.ok(Number(v)>0);
 }finally{f.close();state.hiramshotTestUser=null;}
});

test('account upload provenance survives transfer and cannot approve an account without all requirements',async()=>{
 const f=await setup();try{const id=crypto.randomUUID(),now=new Date().toISOString();f.sqlite.prepare("INSERT INTO account_verifications(id,user_id,personal,status,expires_at,created_at,updated_at) VALUES (?,?,?,'PENDING','2099-01-01',?,?)").run(id,f.client,await encrypt(personal),now,now);
  const session=await cookie(),received=await send(id,session,{account:true});assert.equal(received.status,201,await received.clone().text());assert.equal(f.objects.size,1);
  assert.throws(()=>f.sqlite.prepare("UPDATE account_verifications SET status='APPROVED',verified_at='test',reviewed_by='owner' WHERE id=?").run(id),/Five reviewed/);
  const bookingId=f.booking();f.sqlite.prepare("UPDATE bookings SET status='requested',personal=NULL WHERE id=?").run(bookingId);
  state.hiramshotTestUser=renter;assert.equal(await attachAccountVerification(request('/api/account/verification',{}),f.client,renter.userId,bookingId),true);
  const row=f.sqlite.prepare('SELECT submission_source,submitted_by FROM kyc_documents WHERE booking_id=?').get(bookingId);assert.equal(row?.submission_source,'ADMIN_MESSENGER');assert.equal(row?.submitted_by,'owner');assert.equal(f.objects.size,1);
 }finally{f.close();state.hiramshotTestUser=null;}
});

test('known-client approval is explicit, revision-bound, private and does not fabricate KYC or a video call',async()=>{
 const f=await setup();try{const id=await f.create(),session=await cookie();
  assert.equal((await approve(id,'')).status,403);state.hiramshotTestUser=renter;assert.equal((await approve(id,session)).status,403);state.hiramshotTestUser=admin;
  for(const invalid of [null,[],true])assert.equal((await exception.POST(request(`/api/admin/bookings/${id}/known-client-approval`,invalid,session),ctx(id))).status,400);
  for(const patch of [{reason:'short'},{relationship:'STRANGER'},{acceptResponsibility:false},{personallyKnown:false},{confirmReference:'wrong'}])assert.equal((await approve(id,session,patch)).status,400);
  assert.equal((await approve(id,session,{reviewVersion:1})).status,409);
  const response=await approve(id,session);assert.equal(response.status,200,await response.clone().text());const row=f.sqlite.prepare('SELECT * FROM bookings WHERE id=?').get(id);assert.equal(row?.status,'verified');assert.equal(row?.verification_basis,'KNOWN_CLIENT_EXCEPTION');assert.equal(row?.live_video_verified_at,null);
  const client=f.sqlite.prepare('SELECT kyc_status,video_call_verified,is_trusted_repeat_client FROM users WHERE id=?').get(f.client);assert.notEqual(client?.kyc_status,'VERIFIED');assert.equal(client?.video_call_verified,0);assert.equal(client?.is_trusted_repeat_client,0);
  const grant=f.sqlite.prepare('SELECT * FROM booking_verification_exceptions').get();assert.equal(grant?.approved_by,'owner');assert.ok(String(grant?.reason).startsWith('v1.'));assert.equal((await decrypt(String(grant?.reason))).reason,'Known personally as a family relative.');
  assert.throws(()=>f.sqlite.prepare('DELETE FROM booking_verification_exceptions').run(),/append-only/);assert.throws(()=>f.sqlite.prepare("UPDATE booking_verification_exceptions SET relationship='PERSONALLY_KNOWN'").run(),/append-only/);
  await requireBookingApproval(await getBooking(id,renter.userId));const other=await f.create();assert.throws(()=>f.sqlite.prepare("UPDATE bookings SET status='verified',verification_basis='KNOWN_CLIENT_EXCEPTION',verified_at='test' WHERE id=?").run(other),/current administrator exception/);
  assert.equal((await approve(id,session)).status,409);assert.equal((await send(id,session)).status,409);
  f.sqlite.prepare('UPDATE bookings SET kyc_version=kyc_version+1 WHERE id=?').run(id);await assert.rejects(requireBookingApproval(await getBooking(id,renter.userId)),/current identity review/);
 }finally{f.close();state.hiramshotTestUser=null;}
});

test('known-client approval keeps payment, reservation, contract and turnover checks in place',async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-11-04T09:00:00+08:00'));
 const f=await setup();try{const id=await f.create(),session=await cookie();assert.equal((await approve(id,session)).status,200);
  const terms={location:'Synthetic handover location',pickupAt:pickup,returnAt:returned,replacementValues:{x5:35000}},reserve=()=>booking.POST(request('/api/bookings/'+id,{action:'reserve',terms,customerAgreed:true},session),ctx(id));
  const unpaid=await reserve();assert.equal(unpaid.status,409);assert.match(await unpaid.text(),/reservation payment/);
  const row=await getBooking(id,renter.userId),quote=JSON.parse(row.quote);await recordPayment(request('/synthetic-payment',{}),admin,row,{kind:'RESERVATION',amountPhp:String(quote.reservationMax),paymentMethod:'CASH',remarks:'Synthetic test only',confirmed:true,requestKey:crypto.randomUUID()});
  const reserved=await reserve();assert.equal(reserved.status,200,await reserved.clone().text());assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM unit_reservations WHERE booking_id=?').get(id)?.n,1);
  state.hiramshotTestUser=renter;const signed=await contract.POST(request('/api/bookings/'+id+'/contract',{policyVersion:POLICY_VERSION,accepted:POLICIES.map((_,i)=>i),signature:{name:personal.fullName,strokes:[]}}),ctx(id));assert.equal(signed.status,200,await signed.clone().text());assert.ok(f.objects.size>0);
  state.hiramshotTestUser=admin;const release=await booking.POST(request('/api/bookings/'+id,{action:'turnover',inspectionRecorded:true,contractPhotoRecorded:true,method:'Self-pickup',returnCutoff:returned},session),ctx(id));assert.equal(release.status,409);assert.match(await release.text(),/rental balance and refundable deposit/);
  f.sqlite.prepare("UPDATE users SET account_status='BLOCKED' WHERE id=?").run(f.client);await assert.rejects(requireBookingApproval(await getBooking(id,renter.userId)),/client must be active/);
 }finally{f.close();state.hiramshotTestUser=null;}
});

test('an in-flight file cannot silently change a booking after its known-client approval',async()=>{
 const f=await setup();try{const id=await f.create(),session=await cookie(),scanner=state.hiramshotTestEnv.MALWARE_SCANNER.fetch;
  let started=()=>{},release=()=>{};const scanning=new Promise<void>(resolve=>{started=resolve;}),finish=new Promise<void>(resolve=>{release=resolve;});
  state.hiramshotTestEnv.MALWARE_SCANNER.fetch=async(req:Request)=>{started();await finish;return scanner(req);};
  const pending=send(id,session);await scanning;
  assert.equal((await approve(id,session)).status,200);
  const remove=state.hiramshotTestEnv.BUCKET.delete;state.hiramshotTestEnv.BUCKET.delete=async()=>{throw new Error('Synthetic storage outage');};release();
  assert.equal((await pending).status,409);assert.equal(f.objects.size,1);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM kyc_documents').get()?.n,0);
  assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM kyc_object_cleanup').get()?.n,1);
  state.hiramshotTestEnv.BUCKET.delete=remove;f.sqlite.prepare("UPDATE kyc_object_cleanup SET created_at='2000-01-01'").run();await purgeExpired(state.hiramshotTestEnv);assert.equal(f.objects.size,0);
  await requireBookingApproval(await getBooking(id,renter.userId));
 }finally{f.close();state.hiramshotTestUser=null;}
});

test('an uncertain database reply is reconciled before deleting a successfully stored client file',async()=>{
 const f=await setup();try{const id=await f.create(),session=await cookie(),batch=state.hiramshotTestEnv.DB.batch;
  state.hiramshotTestEnv.DB.batch=async(statements:any[])=>{const result=await batch(statements);if(statements[0].sql.startsWith('INSERT INTO kyc_documents'))throw new Error('Synthetic lost commit reply');return result;};
  const response=await send(id,session);assert.equal(response.status,201,await response.clone().text());assert.equal(f.objects.size,1);
  const row=f.sqlite.prepare('SELECT object_key FROM kyc_documents').get();assert.ok(f.objects.has(String(row?.object_key)));assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM kyc_object_cleanup').get()?.n,0);
 }finally{f.close();state.hiramshotTestUser=null;}
});

test('administrator uploads keep the shared ten-attempt file limit and pending-detail rules',async()=>{
 const f=await setup();try{const id=await f.create(),session=await cookie();
  f.sqlite.prepare('UPDATE bookings SET personal=NULL WHERE id=?').run(id);assert.equal((await approve(id,session)).status,409);
  f.sqlite.prepare("UPDATE users SET account_status='BLOCKED' WHERE id=?").run(f.client);assert.equal((await send(id,session)).status,409);assert.equal(f.objects.size,0);
  f.sqlite.prepare("UPDATE users SET account_status='ACTIVE' WHERE id=?").run(f.client);
  // The blocked-account attempt also consumed one file-limit slot, before any storage write.
  for(let i=0;i<9;i++)assert.equal((await send(id,session,{consent:false})).status,400);
  assert.equal((await send(id,session,{consent:false})).status,429);assert.equal(f.objects.size,0);
 }finally{f.close();state.hiramshotTestUser=null;}
});
