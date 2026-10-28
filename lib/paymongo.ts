// Server-side preparation only. No public checkout or ledger-posting route is
// enabled until merchant test-mode and webhook/financial acceptance checks pass.
import {createHmac,timingSafeEqual} from 'node:crypto';
type Settings={secretKey:string;live:boolean;fetch?:typeof fetch};
const identifier=(value:unknown,prefix:string)=>typeof value==='string'&&new RegExp('^'+prefix+'_[A-Za-z0-9]{8,100}$').test(value);
export function checkoutPayload(input:{bookingId:string;reference:string;amountCentavos:number;origin:string}){
 if(!/^[a-f0-9-]{36}$/i.test(input.bookingId)||!/^[A-Za-z0-9_-]{8,100}$/.test(input.reference)||!Number.isSafeInteger(input.amountCentavos)||input.amountCentavos<100||input.amountCentavos>100000000)throw new Error('Invalid server-calculated checkout amount or reference.');
 const origin=new URL(input.origin);if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('A canonical HTTPS origin is required.');
 const returned=new URL('/book',origin);returned.searchParams.set('id',input.bookingId);returned.searchParams.set('payment','return');const cancelled=new URL(returned);cancelled.searchParams.set('payment','cancel');
 return {data:{attributes:{line_items:[{name:'HiramShot reservation downpayment',amount:input.amountCentavos,currency:'PHP',quantity:1}],payment_method_types:['gcash','qrph'],success_url:returned.href,cancel_url:cancelled.href,reference_number:input.reference,pass_on_fees:false}}};
}
export async function createHostedCheckout(input:Parameters<typeof checkoutPayload>[0],settings:Settings){
 if(!new RegExp('^sk_'+(settings.live?'live':'test')+'_[A-Za-z0-9]+$').test(settings.secretKey))throw new Error('Payment key mode does not match the selected environment.');
 let response:Response;try{response=await(settings.fetch||fetch)('https://api.paymongo.com/v2/checkout_sessions',{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:'Basic '+Buffer.from(settings.secretKey+':').toString('base64'),'Content-Type':'application/json'},body:JSON.stringify(checkoutPayload(input))});}catch{throw new Error('Checkout creation could not be confirmed. Reconcile the reference before creating another session.');}
 if(!response.ok)throw new Error('The payment provider rejected checkout creation.');
 const result=await response.json() as any,session=result?.data,url=new URL(session?.attributes?.checkout_url||'https://invalid.local');
 if(!identifier(session?.id,'cs')||session.attributes.livemode!==settings.live||url.origin!=='https://checkout.paymongo.com'||url.username||url.password)throw new Error('Invalid checkout response.');
 return {sessionId:session.id as string,url:url.href};
}
export function verifyPaymongoSignature(raw:string,header:string|null,secret:string,live:boolean,now=Math.floor(Date.now()/1000)){
 if(!header||raw.length>262144||secret.length<16)return false;const fields=new Map<string,string>();
 for(const part of header.split(',')){const separator=part.indexOf('=');if(separator<1)return false;const key=part.slice(0,separator).trim(),value=part.slice(separator+1).trim();if(fields.has(key))return false;fields.set(key,value);}
 const timestamp=fields.get('t')||'',signature=fields.get(live?'li':'te')||'';
 if(!/^\d{1,16}$/.test(timestamp)||!Number.isSafeInteger(Number(timestamp))||Math.abs(now-Number(timestamp))>300||!/^[a-f0-9]{64}$/i.test(signature))return false;
 const expected=createHmac('sha256',secret).update(timestamp+'.'+raw).digest();return timingSafeEqual(expected,Buffer.from(signature,'hex'));
}
export function paidCheckout(raw:string,expected:{sessionId:string;reference:string;amountCentavos:number;live:boolean}){
 const event=JSON.parse(raw)?.data,session=event?.attributes?.data,attributes=session?.attributes,payments=attributes?.payments;
 if(!identifier(event?.id,'evt')||event.attributes.type!=='checkout_session.payment.paid'||event.attributes.livemode!==expected.live||session?.id!==expected.sessionId||session.type!=='checkout_session'||attributes?.reference_number!==expected.reference||!Array.isArray(payments))throw new Error('Payment event does not match this checkout.');
 const paid=payments.filter((payment:any)=>payment?.attributes?.status==='paid');if(paid.length!==1)throw new Error('Exactly one paid payment is required.');
 const payment=paid[0],intent=attributes.payment_intent;
 if(!identifier(payment.id,'pay')||payment.attributes.currency!=='PHP'||payment.attributes.amount!==expected.amountCentavos||!['gcash','qrph'].includes(payment.attributes.source?.type)||intent?.attributes?.status!=='succeeded'||intent.attributes.currency!=='PHP'||intent.attributes.amount!==expected.amountCentavos||payment.attributes.payment_intent_id!==intent.id)throw new Error('Paid amount, currency, intent or channel does not match.');
 return {eventId:event.id as string,paymentId:payment.id as string,method:payment.attributes.source.type as 'gcash'|'qrph',amountCentavos:expected.amountCentavos};
}
