import test from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword,verifyPassword,normalizeLoginEmail,validatePassword,newPasswordToken,passwordTokenHash} from '../lib/password-crypto';
import {passwordReady} from '../lib/password-settings';
import {boundedAuthRequest} from '../lib/auth-request';
import {administratorEmail} from '../lib/admin-access';
test('password hashing uses unique salts and rejects incorrect or malformed hashes',async()=>{
 const value='Z7!q2M8#r4';assert.equal(value.length,10);const first=await hashPassword(value),second=await hashPassword(value);
 assert.notEqual(first,second);assert.match(first,/^scrypt\$32768\$8\$3\$/);assert.ok(!first.includes(value));
 assert.equal(await verifyPassword(value,first),true);assert.equal(await verifyPassword(value+'!',first),false);
 assert.equal(await verifyPassword(value,first.replace('$32768$','$1$')),false);assert.equal(await verifyPassword('x'.repeat(600),first),false);
});
test('email and passphrase validation preserve passwords without arbitrary composition rules',()=>{
 assert.equal(normalizeLoginEmail(' Owner@Example.COM '),'owner@example.com');
 assert.equal(normalizeLoginEmail('Customer@Yahoo.com'),'customer@yahoo.com');assert.equal(normalizeLoginEmail('Customer@Outlook.com'),'customer@outlook.com');
 for(const value of ['bad','a@b','a\n@example.com',null])assert.throws(()=>normalizeLoginEmail(value));
 for(const value of ['short','Ab7!xy2?Z','a'.repeat(20),'password123','1234567890','qwertyuiop','password12345678','a'.repeat(129),null])assert.throws(()=>validatePassword(value));
 assert.equal(validatePassword('Z7!q2M8#r4'),'Z7!q2M8#r4');
 assert.equal(validatePassword('  spaces are supported  '),'  spaces are supported  ');
});
test('reset tokens have 256 bits of randomness and only their digest is stored',()=>{
 const first=newPasswordToken(),second=newPasswordToken();assert.equal(first.length,43);assert.notEqual(first,second);assert.match(passwordTokenHash(first),/^[a-f0-9]{64}$/);assert.notEqual(passwordTokenHash(first),passwordTokenHash(second));assert.throws(()=>passwordTokenHash('invalid'));
});
test('password sign-in fails closed until all external services and runtime verification are configured',()=>{
 const values={PASSWORD_AUTH_ENABLED:'true',PASSWORD_HASHING_VERIFIED:'true',AUTH_EMAIL_FROM:'accounts@example.com',RESEND_API_KEY:'SYNTHETIC',TURNSTILE_SITE_KEY:'SYNTHETIC',TURNSTILE_SECRET_KEY:'SYNTHETIC'};
 assert.equal(passwordReady(values),true);for(const key of Object.keys(values))assert.equal(passwordReady({...values,[key]:undefined}),false,key);
 const native={...values,RESEND_API_KEY:undefined,AUTH_EMAIL_PROVIDER:'cloudflare',AUTH_EMAIL_DOMAIN_VERIFIED:'true'};assert.equal(passwordReady(native,true),true);assert.equal(passwordReady(native,false),false);assert.equal(passwordReady({...native,AUTH_EMAIL_DOMAIN_VERIFIED:'false'},true),false);
});
test('authentication POST keeps its cookies and body and rejects cross-origin or oversized requests',async()=>{
 const source=new Request('https://example.invalid/api/auth/callback/credentials',{method:'POST',headers:{Origin:'https://example.invalid',Cookie:'synthetic=csrf','Content-Type':'application/x-www-form-urlencoded'},body:'csrfToken=SYNTHETIC'}),bounded=await boundedAuthRequest(source);
 assert.equal(bounded.method,'POST');assert.equal(bounded.headers.get('cookie'),'synthetic=csrf');assert.equal(await bounded.text(),'csrfToken=SYNTHETIC');
 await assert.rejects(boundedAuthRequest(new Request(source.url,{method:'POST',headers:{Origin:'https://attacker.invalid'},body:'synthetic'})),/origin/);
 await assert.rejects(boundedAuthRequest(new Request(source.url,{method:'POST',headers:{Origin:'https://example.invalid'},body:'x'.repeat(8193)})),/size/);
});
test('only the three owner-approved email addresses qualify for administrator access',()=>{
 const list='owner.one@example.invalid,owner.two@example.invalid,business@example.invalid';
 for(const email of list.split(','))assert.equal(administratorEmail(email.toUpperCase(),list),true);
 for(const email of ['attacker@example.invalid','owner.one@example.invalid.attacker.invalid','oldowner@example.invalid',''])assert.equal(administratorEmail(email,list),false);
 assert.equal(administratorEmail('business@example.invalid',undefined),false);
});
