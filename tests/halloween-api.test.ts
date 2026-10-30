import test from 'node:test';
import assert from 'node:assert/strict';
import {notificationFixture} from './notification-fixture';
import * as booking from '../app/api/bookings/route';
import {POLICY_VERSION} from '../lib/policies';
const state=globalThis as unknown as {hiramshotTestEnv:Cloudflare.Env;hiramshotTestUser:unknown};
test('the booking API computes and snapshots its own Halloween price and rejects a stale client total',async t=>{
 const f=notificationFixture(),originalFetch=globalThis.fetch;t.mock.method(Date,'now',()=>Date.parse('2026-10-31T12:00:00+08:00'));
 Object.assign(state.hiramshotTestEnv,f.env,{TURNSTILE_SITE_KEY:'synthetic-site',TURNSTILE_SECRET_KEY:'synthetic-secret',AUDIT_HMAC_KEY:'synthetic-audit-key-'.repeat(3),DATA_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64')});state.hiramshotTestUser={userId:'synthetic-client',email:'client@example.invalid',fullName:'Synthetic Renter',displayName:'Synthetic Renter'};
 globalThis.fetch=async input=>{if(String(input)==='https://challenges.cloudflare.com/turnstile/v0/siteverify')return Response.json({success:true,hostname:'example.invalid',action:'booking'});throw new Error('Unexpected external request');};
 const base={requestKey:crypto.randomUUID(),pickupDatetime:'2026-11-03T10:00:00+08:00',returnDatetime:'2026-11-05T10:00:00+08:00',items:[{equipmentId:'x5',variant:'Standard',addons:['battery']}],name:'Synthetic Renter',phone:'09170000001',destinationOrEvent:'Synthetic fixture only',turnoverMethod:'SELF_PICKUP_NORZAGARAY',consent:true,antiFraudConsent:true,policyVersion:POLICY_VERSION,turnstileToken:'synthetic'};
 const send=(body:unknown)=>booking.POST(new Request('https://example.invalid/api/bookings',{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json'},body:JSON.stringify(body)}));
 try{
  assert.equal((await send({...base,expectedTotal:1600})).status,409);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM bookings').get()?.n,0);
  const response=await send({...base,expectedTotal:1470,promotion:{percent:99,discount:999999}});assert.equal(response.status,201);const id=(await response.json() as {id:string}).id,row=f.sqlite.prepare('SELECT quote,total_rental_fee_centavos FROM bookings WHERE id=?').get(id),quote=JSON.parse(String(row?.quote));assert.equal(quote.totalMax,1470);assert.equal(quote.promotion.percent,10);assert.equal(quote.promotion.discount,130);assert.equal(row?.total_rental_fee_centavos,147000);assert.equal(quote.depositMax,1000);assert.equal(quote.reservationMax,500);
  assert.equal(f.sqlite.prepare("SELECT COUNT(*) n FROM owner_notifications WHERE kind='NEW_BOOKING'").get()?.n,1);assert.equal((await send({...base,expectedTotal:1600})).status,200);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM bookings').get()?.n,1);
 }finally{globalThis.fetch=originalFetch;state.hiramshotTestUser=null;f.close();}
});
