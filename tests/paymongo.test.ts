import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {checkoutPayload,createHostedCheckout,verifyPaymongoSignature,paidCheckout} from '../lib/paymongo';
const input={bookingId:'00000000-0000-4000-8000-000000000001',reference:'SYNTHETIC_REFERENCE',amountCentavos:76500,origin:'https://hiramshot.com'};
test('hosted checkout preserves exact PHP centavos and canonical return URLs',()=>{
 const attributes=checkoutPayload(input).data.attributes;assert.equal(attributes.line_items[0].amount,76500);assert.deepEqual(attributes.payment_method_types,['gcash','qrph']);assert.equal(new URL(attributes.success_url).origin,input.origin);assert.equal(attributes.pass_on_fees,false);
 assert.throws(()=>checkoutPayload({...input,amountCentavos:765.5}));assert.throws(()=>checkoutPayload({...input,origin:'http://hiramshot.com'}));
});
test('payment creation validates mode and provider redirect and never retries uncertain writes',async()=>{
 let calls=0;await assert.rejects(createHostedCheckout(input,{secretKey:'sk_test_SYNTHETIC',live:false,fetch:async()=>{calls++;throw new Error('SYNTHETIC_NETWORK');}}));assert.equal(calls,1);
 await assert.rejects(createHostedCheckout(input,{secretKey:'sk_live_SYNTHETIC',live:false}));
 await assert.rejects(createHostedCheckout(input,{secretKey:'sk_test_SYNTHETIC',live:false,fetch:async()=>Response.json({data:{id:'cs_SYNTHETIC123',attributes:{livemode:false,checkout_url:'https://checkout.paymongo.com.attacker.invalid/'}}})}));
});
test('webhook signatures bind exact raw bytes, timestamp and live/test mode',()=>{
 const raw='{"synthetic":true}',secret='SYNTHETIC_WEBHOOK_SECRET',now=1793140000,signature=createHmac('sha256',secret).update(now+'.'+raw).digest('hex'),header=`t=${now},te=${signature},li=`;
 assert.equal(verifyPaymongoSignature(raw,header,secret,false,now),true);assert.equal(verifyPaymongoSignature(raw+' ',header,secret,false,now),false);assert.equal(verifyPaymongoSignature(raw,header,secret,true,now),false);assert.equal(verifyPaymongoSignature(raw,header,secret,false,now+301),false);assert.equal(verifyPaymongoSignature(raw,header+',t='+now,secret,false,now),false);
});
test('payment evidence must match session, reference, exact gross amount and successful intent',()=>{
 const event={data:{id:'evt_SYNTHETIC123',attributes:{type:'checkout_session.payment.paid',livemode:false,data:{id:'cs_SYNTHETIC123',type:'checkout_session',attributes:{reference_number:input.reference,payment_intent:{id:'pi_SYNTHETIC123',attributes:{amount:76500,currency:'PHP',status:'succeeded'}},payments:[{id:'pay_SYNTHETIC123',attributes:{amount:76500,currency:'PHP',status:'paid',payment_intent_id:'pi_SYNTHETIC123',source:{type:'qrph'}}}]}}}}};
 const expected={sessionId:'cs_SYNTHETIC123',reference:input.reference,amountCentavos:76500,live:false};assert.equal(paidCheckout(JSON.stringify(event),expected).method,'qrph');
 for(const changed of [{amountCentavos:65000},{reference:'OTHER_REFERENCE'},{live:true},{sessionId:'cs_OTHER12345'}])assert.throws(()=>paidCheckout(JSON.stringify(event),{...expected,...changed}));
 event.data.attributes.data.attributes.payments[0].attributes.currency='USD';assert.throws(()=>paidCheckout(JSON.stringify(event),expected));
});
