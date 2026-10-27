import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'https://hiramshot.com';
const host=process.env.TEST_HOST||'hiramshot.com';
const googleConfigured=process.env.TEST_GOOGLE_CONFIGURED==='true';
let loginHtml='';
for(const [path,status,extra]of [['/',303,{}],['/account',303,{}],['/admin',303,{}],['/api/bookings',401,{}],['/api/account',401,{}],['/api/documents/00000000-0000-4000-8000-000000000001',401,{}],['/api/bookings',401,{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'anjhon.hulguin02@gmail.com'}],['/login',200,{}],['/api/auth/providers',googleConfigured?200:503,{}],['/assets/logo.png',200,{}]]){
 const response=await fetch(base+path,{redirect:'manual',headers:{Host:host,...extra}}),body=response.headers.get('content-type')?.startsWith('image/')?'':await response.text();assert.equal(response.status,status,path+': '+body.slice(0,200));
 assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.ok(response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"));assert.ok(response.headers.get('x-robots-tag')?.includes('noindex'));
 if(path==='/login'){loginHtml=body;assert.ok(body.includes('Continue with Google'));if(!googleConfigured)assert.ok(body.includes('disabled'));}
 console.log('PASS',status,path);
}
// A successful HTML response alone cannot prove that the deployed UI loads.
const assets=[...new Set([...loginHtml.matchAll(/(?:href|src)="(\/_next\/static\/[^"?]+\.(?:css|js))"/g)].map(match=>match[1]))];
assert.ok(assets.some(path=>path.endsWith('.css')),'login must reference its stylesheet');
assert.ok(assets.some(path=>path.endsWith('.js')),'login must reference browser modules');
await Promise.all(assets.map(async path=>{
 const response=await fetch(base+path,{redirect:'manual',headers:{Host:host}});
 assert.equal(response.status,200,path);
 const type=response.headers.get('content-type')||'';
 assert.match(type,path.endsWith('.css')?/^text\/css/:/^(?:text|application)\/(?:javascript|ecmascript)/,path);
 assert.ok((await response.text()).length>100,path+' is empty');
 assert.equal(response.headers.get('x-content-type-options'),'nosniff');
}));
console.log('PASS',assets.length,'referenced CSS/JavaScript assets');
if(googleConfigured){
 const csrfResponse=await fetch(base+'/api/auth/csrf',{headers:{Host:host}}),{csrfToken}=await csrfResponse.json();
 assert.ok(csrfToken,'CSRF token required');
 const cookie=csrfResponse.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
 assert.ok(cookie.includes('authjs.csrf-token='),'CSRF cookie required');
 const signIn=await fetch(base+'/api/auth/signin/google',{method:'POST',redirect:'manual',headers:{Host:host,Origin:base,Cookie:cookie,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrfToken,callbackUrl:base+'/'})});
 assert.equal(signIn.status,302);const destination=new URL(signIn.headers.get('location'));
 assert.equal(destination.origin,'https://accounts.google.com');
 assert.equal(destination.searchParams.get('redirect_uri'),base+'/api/auth/callback/google');
 assert.equal(destination.searchParams.get('code_challenge_method'),'S256');
 assert.deepEqual(destination.searchParams.get('scope').split(' ').sort(),['email','openid','profile']);
 for(const name of ['__Secure-authjs.state','__Secure-authjs.pkce.code_verifier','__Secure-authjs.nonce']){
  const value=signIn.headers.getSetCookie().find(value=>value.startsWith(name+'='));
  assert.ok(value,name+' required');assert.match(value,/; Secure/i);assert.match(value,/; HttpOnly/i);assert.match(value,/; SameSite=lax/i);
 }
 const rejected=await fetch(base+'/api/auth/signin/google',{method:'POST',redirect:'manual',headers:{Host:host,Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({csrfToken:'invalid',callbackUrl:base+'/'})});
 assert.equal(rejected.status,302);assert.equal(new URL(rejected.headers.get('location')).origin,base);
 assert.ok(!rejected.headers.getSetCookie().some(value=>value.startsWith('__Secure-authjs.state=')));
 console.log('PASS OAuth POST, secure check cookies, canonical callback, limited scopes and CSRF rejection');
}
