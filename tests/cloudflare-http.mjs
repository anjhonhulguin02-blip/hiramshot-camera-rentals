import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'https://hiramshot.com';
const host=process.env.TEST_HOST||'hiramshot.com';
for(const [path,status,extra]of [['/',303,{}],['/account',303,{}],['/admin',303,{}],['/api/bookings',401,{}],['/api/account',401,{}],['/api/documents/00000000-0000-4000-8000-000000000001',401,{}],['/api/bookings',401,{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'anjhon.hulguin02@gmail.com'}],['/login',200,{}],['/api/auth/providers',503,{}],['/assets/logo.png',200,{}]]){
 const response=await fetch(base+path,{redirect:'manual',headers:{Host:host,...extra}}),body=response.headers.get('content-type')?.startsWith('image/')?'':await response.text();assert.equal(response.status,status,path+': '+body.slice(0,200));
 assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.ok(response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"));assert.ok(response.headers.get('x-robots-tag')?.includes('noindex'));
 if(path==='/login'){assert.ok(body.includes('Continue with Google'));assert.ok(body.includes('disabled'));}
 console.log('PASS',status,path);
}
