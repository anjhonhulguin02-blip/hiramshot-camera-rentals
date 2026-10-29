import test from 'node:test';
import assert from 'node:assert/strict';
import {paymentQrSettings,reservationQrAmount} from '../lib/payment-qr';
const settings={key:'business-payments/official-qr.jpg',mime:'image/jpeg',sha256:'a'.repeat(64),recipientLabel:'SAMPLE RECIPIENT'};
test('payment QR settings cannot expose arbitrary objects, active MIME types or unverified bytes',()=>{
 assert.deepEqual(paymentQrSettings(JSON.stringify(settings)),settings);
 for(const invalid of [{...settings,key:'kyc/private.jpg'},{...settings,key:'../qr.jpg'},{...settings,mime:'image/svg+xml'},{...settings,sha256:'wrong'},{...settings,recipientLabel:''}])assert.equal(paymentQrSettings(JSON.stringify(invalid)),null);
 assert.equal(paymentQrSettings('not-json'),null);
});
test('only verified real bookings with an outstanding reservation amount receive payment instructions',()=>{
 const booking={status:'verified',verified_at:'2026-10-28T00:00:00Z',is_demo:0};
 assert.equal(reservationQrAmount(booking,{reservationDueCentavos:50000}),50000);
 for(const invalid of [{...booking,verified_at:null},{...booking,status:'requested'},{...booking,status:'cancelled'},{...booking,is_demo:1}])assert.throws(()=>reservationQrAmount(invalid,{reservationDueCentavos:50000}));
 for(const amount of [0,-1,1.5,Number.NaN])assert.throws(()=>reservationQrAmount(booking,{reservationDueCentavos:amount}));
});
