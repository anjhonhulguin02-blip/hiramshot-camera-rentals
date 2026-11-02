import test from 'node:test';
import assert from 'node:assert/strict';
import {notificationFixture} from './notification-fixture';
import {dayAvailability,unavailableEquipment} from '../lib/availability';
import {INITIAL_CATALOG,calculateQuote} from '../lib/catalog';
import {base64,encrypt,mac} from '../lib/security';
import * as availability from '../app/api/availability/route';
import * as calendar from '../app/api/admin/calendar/route';
import * as booking from '../app/api/bookings/[id]/route';
import * as listing from '../app/api/bookings/route';
const state=globalThis as unknown as {hiramshotTestEnv:any;hiramshotTestUser:any},origin='https://example.invalid';
const renter={userId:'synthetic-client',email:'client@example.invalid',fullName:'Synthetic Renter',displayName:'Synthetic Renter'},admin={userId:'synthetic-owner',email:'owner@example.invalid',fullName:'Synthetic Owner',displayName:'Synthetic Owner'};
function setup(){const f=notificationFixture();Object.assign(state.hiramshotTestEnv,f.env,{DATA_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64'),ADMIN_SESSION_SECRET:'synthetic-session-'.repeat(3),AUDIT_HMAC_KEY:'synthetic-audit-'.repeat(3),ADMIN_ACCESS_EMAILS:admin.email});state.hiramshotTestUser=renter;f.sqlite.prepare("INSERT INTO users(id,auth_user_id,role,full_name,email,created_at,updated_at) VALUES ('owner',?,'ADMIN',?,?,'test','test')").run(admin.userId,admin.fullName,admin.email);return f;}
async function cookie(){const payload=base64(new TextEncoder().encode(JSON.stringify({uid:admin.userId,exp:Date.now()+60000})));return '__Host-hiramshot-admin='+encodeURIComponent(payload+'~'+await mac(payload,state.hiramshotTestEnv.ADMIN_SESSION_SECRET));}
function req(path:string,method='GET',body?:unknown,token=''){return new Request(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:token},...(body?{body:JSON.stringify(body)}:{})});}
const ctx=(id:string)=>({params:Promise.resolve({id})});
const pickup='2026-11-05T09:00:00+08:00',returned='2026-11-07T09:00:00+08:00';
async function record(f:ReturnType<typeof setup>,gear='x5'){
 const id=f.booking(),items=[{equipmentId:gear,variant:'Standard',addons:[]}],quote=calculateQuote(INITIAL_CATALOG,items,2),contact=await encrypt({name:'Synthetic Renter',email:renter.email,phone:'09170000001'});
 f.sqlite.prepare("UPDATE bookings SET personal=NULL,contact=?,items=?,quote=?,booking_reference_code=?,start_date='2026-11-05',end_date='2026-11-07',pickup_datetime=?,return_datetime=?,days=2 WHERE id=?").run(contact,JSON.stringify(items),JSON.stringify(quote),'HSR-SYNTHETIC-'+id.slice(0,8),pickup,returned,id);return id;
}
function hold(f:ReturnType<typeof setup>,id:string,gear='x5',start=pickup,end=returned){f.sqlite.prepare('INSERT INTO unit_reservations(id,unit_id,booking_id,pickup_ms,return_ms) VALUES (?,?,?,?,?)').run(crypto.randomUUID(),gear+'-unit-1',id,Date.parse(start),Date.parse(end));}

test('calendar differentiates full, partial and adjacent periods without inventing extra physical capacity',()=>{
 const unit=[{id:'physical',active:1}],date='2026-11-06',first=Date.parse(date+'T00:00:00+08:00'),mid=first+43200000,last=first+86400000;
 assert.equal(dayAvailability(unit,[],[],new Set(),date).state,'available');
 assert.equal(dayAvailability(unit,[{unit_id:'physical',pickup_ms:first,return_ms:mid}],[],new Set(),date).state,'partial');
 assert.equal(dayAvailability(unit,[{unit_id:'physical',pickup_ms:first,return_ms:mid},{unit_id:'physical',pickup_ms:mid,return_ms:last}],[],new Set(),date).state,'unavailable');
 assert.equal(dayAvailability(unit,[],[],new Set(['physical']),date).state,'unavailable');
 assert.equal(dayAvailability([],[],[],new Set(),date).state,'unavailable');
 assert.equal(dayAvailability(unit,[],[{unit_id:'physical',day:date}],new Set(),date).state,'unavailable');
});

test('public availability hides customer data and respects exact times, maintenance, legacy return-day holds and shared Neo packages',async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-11-02T09:00:00+08:00'));const f=setup();try{
  const id=await record(f);hold(f,id);
  const response=await availability.GET(req('/api/availability?month=2026-11&equipment=x5')),text=await response.text(),data=JSON.parse(text);
  assert.equal(response.status,200);assert.ok(!text.includes(renter.email));assert.ok(!text.includes('Synthetic Renter'));assert.ok(!text.includes(id));
  assert.equal(data.gear[0].days.find((d:any)=>d.date==='2026-11-05').state,'partial');assert.equal(data.gear[0].days.find((d:any)=>d.date==='2026-11-06').state,'unavailable');
  assert.deepEqual(await unavailableEquipment(['x5'],Date.parse(pickup),Date.parse(returned)),['x5']);
  assert.deepEqual(await unavailableEquipment(['x5'],Date.parse(returned),Date.parse('2026-11-08T09:00:00+08:00')),[]);
  const neo=await record(f,'neo2');hold(f,neo,'neo2');assert.deepEqual(await unavailableEquipment(['neo2'],Date.parse(pickup),Date.parse(returned)),['neo2']);
  f.sqlite.prepare("UPDATE units SET active=0 WHERE equipment_id='x6'").run();assert.deepEqual(await unavailableEquipment(['x6'],Date.parse(pickup),Date.parse(returned)),['x6']);
  const legacy=await record(f);f.sqlite.prepare("INSERT INTO booking_days(id,booking_id,unit_id,day) VALUES (?,?,'x5-unit-1','2026-11-08')").run(crypto.randomUUID(),legacy);
  assert.deepEqual(await unavailableEquipment(['x5'],Date.parse('2026-11-07T10:00:00+08:00'),Date.parse('2026-11-08T09:00:00+08:00')),['x5']);
  assert.equal((await availability.GET(req('/api/availability?month=2026-99&equipment=x5'))).status,400);
 }finally{state.hiramshotTestUser=null;f.close();}
});

test('simultaneous unit claims cannot overlap and a multi-equipment claim rolls back as a whole',async()=>{
 const f=setup();try{const one=await record(f),two=await record(f),three=await record(f);hold(f,one);
  assert.throws(()=>hold(f,two),/overlap/);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM unit_reservations').get()?.n,1);
  await assert.rejects(f.env.DB!.batch([
   f.env.DB!.prepare('INSERT INTO unit_reservations(id,unit_id,booking_id,pickup_ms,return_ms) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),'x6-unit-1',three,Date.parse(pickup),Date.parse(returned)),
   f.env.DB!.prepare('INSERT INTO unit_reservations(id,unit_id,booking_id,pickup_ms,return_ms) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),'x5-unit-1',three,Date.parse(pickup),Date.parse(returned))
  ]),/overlap/);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM unit_reservations WHERE booking_id=?').get(three)?.n,0);
 }finally{f.close();}
});

test('client cancellation checks ownership and releases both interval and legacy holds',async()=>{
 const f=setup();try{const id=await record(f);hold(f,id);f.sqlite.prepare("INSERT INTO booking_days(id,booking_id,unit_id,day) VALUES (?,?,'x5-unit-1','2026-11-06')").run(crypto.randomUUID(),id);
  state.hiramshotTestUser=admin;assert.equal((await booking.PATCH(req('/api/bookings/'+id,'PATCH',{action:'cancel'}),ctx(id))).status,404);
  state.hiramshotTestUser=renter;assert.equal((await booking.PATCH(req('/api/bookings/'+id,'PATCH',{action:'cancel'}),ctx(id))).status,200);
  assert.equal(f.sqlite.prepare('SELECT status FROM bookings WHERE id=?').get(id)?.status,'cancelled');assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM unit_reservations WHERE booking_id=?').get(id)?.n,0);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM booking_days WHERE booking_id=?').get(id)?.n,0);
  assert.equal((await booking.PATCH(req('/api/bookings/'+id,'PATCH',{action:'cancel'}),ctx(id))).status,409);
 }finally{state.hiramshotTestUser=null;f.close();}
});

test('a new booking request is rejected by the API when its physical gear is already held',async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-11-02T09:00:00+08:00'));const f=setup(),originalFetch=globalThis.fetch;
 Object.assign(state.hiramshotTestEnv,{TURNSTILE_SITE_KEY:'synthetic-site',TURNSTILE_SECRET_KEY:'synthetic-secret'});globalThis.fetch=async()=>Response.json({success:true,hostname:'example.invalid',action:'booking'});
 try{const id=await record(f);hold(f,id);const response=await listing.POST(req('/api/bookings','POST',{requestKey:crypto.randomUUID(),pickupDatetime:pickup,returnDatetime:returned,items:[{equipmentId:'x5',variant:'Standard',addons:[]}],name:'Synthetic Renter',phone:'09170000001',destinationOrEvent:'Synthetic fixture only',turnoverMethod:'SELF_PICKUP_NORZAGARAY',consent:true,antiFraudConsent:true,policyVersion:(await import('../lib/policies')).POLICY_VERSION,turnstileToken:'synthetic',expectedTotal:1300}));
  assert.equal(response.status,409);assert.match((await response.json() as {error:string}).error,/unavailable/);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM bookings').get()?.n,1);
 }finally{globalThis.fetch=originalFetch;state.hiramshotTestUser=null;f.close();}
});

test('admin calendar and archiving require MFA; archive is reversible without restoring a reservation',async t=>{
 t.mock.method(Date,'now',()=>Date.parse('2026-11-02T09:00:00+08:00'));const f=setup();try{const id=await record(f);hold(f,id);
  assert.equal((await calendar.GET(req('/api/admin/calendar?month=2026-11'))).status,403);
  assert.equal((await booking.DELETE(req('/api/bookings/'+id,'DELETE',{reason:'suspected_fraud',confirmReference:id}),ctx(id))).status,403);
  state.hiramshotTestUser=admin;assert.equal((await calendar.GET(req('/api/admin/calendar?month=2026-11'))).status,403);const token=await cookie();
  const schedule=await calendar.GET(req('/api/admin/calendar?month=2026-11','GET',undefined,token));assert.equal(schedule.status,200);assert.equal((await schedule.json() as any).bookings.length,1);
  assert.equal((await booking.DELETE(req('/api/bookings/'+id,'DELETE',{reason:'suspected_fraud',confirmReference:'wrong'},token),ctx(id))).status,400);
  assert.equal((await booking.DELETE(req('/api/bookings/'+id,'DELETE',{reason:'suspected_fraud',confirmReference:id},token),ctx(id))).status,200);
  assert.equal(f.sqlite.prepare('SELECT status FROM bookings WHERE id=?').get(id)?.status,'cancelled');assert.ok(f.sqlite.prepare('SELECT archived_at FROM bookings WHERE id=?').get(id)?.archived_at);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM unit_reservations WHERE booking_id=?').get(id)?.n,0);
  assert.equal((await listing.GET(req('/api/bookings?admin=1','GET',undefined,token))).status,200);assert.equal((await (await listing.GET(req('/api/bookings?admin=1','GET',undefined,token))).json() as any).bookings.length,0);assert.equal((await (await listing.GET(req('/api/bookings?admin=1&archived=1','GET',undefined,token))).json() as any).bookings.length,1);
  const pay=()=>f.sqlite.prepare("INSERT INTO payments(id,booking_id,client_id,recorded_by_admin_id,request_key,kind,amount_centavos,payment_method,remarks,created_at) VALUES (?,?,?,'owner',?,'RESERVATION',100,'GCASH','Synthetic','test')").run(crypto.randomUUID(),id,f.client,crypto.randomUUID());assert.throws(pay,/Archived/);
  assert.equal((await booking.POST(req('/api/bookings/'+id,'POST',{action:'restore'},token),ctx(id))).status,200);assert.equal(f.sqlite.prepare('SELECT archived_at FROM bookings WHERE id=?').get(id)?.archived_at,null);assert.equal(f.sqlite.prepare('SELECT status FROM bookings WHERE id=?').get(id)?.status,'cancelled');assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM unit_reservations WHERE booking_id=?').get(id)?.n,0);
  pay();assert.equal((await booking.DELETE(req('/api/bookings/'+id,'DELETE',{reason:'other',confirmReference:id},token),ctx(id))).status,409);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM payments WHERE booking_id=?').get(id)?.n,1);
 }finally{state.hiramshotTestUser=null;f.close();}
});
