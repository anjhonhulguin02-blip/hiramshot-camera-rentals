import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173';
const signin=await fetch(base+'/signin-with-chatgpt?return_to=/account',{redirect:'manual'});
const cookie=signin.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
assert.ok(cookie,'Local development sign-in must establish its supported session');
const headers={Cookie:cookie,Origin:base,'Content-Type':'application/json'};
const account=await(await fetch(base+'/api/account',{headers:{Cookie:cookie}})).json();
assert.ok(account.account,'Use the existing synthetic local account');
for(const path of ['/api/bookings','/api/account/register']){
 const response=await fetch(base+path,{method:'POST',headers,body:'{}'});
 assert.equal(response.status,503,path+': '+await response.text());
 console.log('PASS: authenticated '+path+' fails closed without Turnstile');
}
const profile={...account.profile,mobileNumber:'09171234567',emergencyContactName:'SYNTHETIC CONTACT',emergencyContactRelationship:'Sibling',emergencyContactNumber:'+639171234567'};
const invalid=await fetch(base+'/api/account',{method:'PATCH',headers,body:JSON.stringify({profile,emergencyContactConsent:true})});
assert.equal(invalid.status,400);
assert.match((await invalid.json()).error,/different/);
console.log('PASS: authenticated profile rejects aliases of the renter mobile as emergency contact');
