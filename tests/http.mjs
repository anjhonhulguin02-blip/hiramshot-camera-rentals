import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173';
for(const [path,status,options]of [
 ['/',200,{}],['/book?gear=x5&start=2026-11-01&end=2026-11-07',200,{}],['/policies',200,{}],['/privacy',200,{}],['/api/catalog',200,{}],['/api/bookings',401,{}],['/api/bookings?admin=1',401,{}],['/api/inventory',401,{}],['/api/documents/00000000-0000-4000-8000-000000000001',401,{}],['/api/bookings',403,{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json'},body:'{}'}],['/api/bookings',401,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'}],['/api/maintenance/purge',401,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'}],['/api/requests',410,{}],['/account',200,{}],['/signup',200,{}],['/api/account',401,{}],['/api/account/payments',401,{}],['/api/users',401,{}],['/api/finance/dashboard',401,{}],['/api/finance/payments?booking=a',401,{}],['/api/finance/export?format=csv',401,{}],['/api/receipts/00000000-0000-4000-8000-000000000001',401,{}],
 ['/api/account/register',401,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'}],
 ['/api/account/register',403,{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json'},body:'{}'}],
 ['/api/documents?bookingId=00000000-0000-4000-8000-000000000001',401,{method:'POST',headers:{Origin:base},body:''}]
]){const r=await fetch(base+path,options);assert.equal(r.status,status,path+': '+await r.text());console.log('PASS',status,path);}
const config=await(await fetch(base+'/api/config')).json();assert.equal(config.kycEnabled,false);assert.equal(config.turnstileSiteKey,null);console.log('PASS: incomplete security configuration fails closed');

assert.equal(config.receiptUploadsEnabled,false);
const robots=await(await fetch(base+'/robots.txt')).text();assert.ok(robots.includes('Disallow: /'));
const sitemap=await(await fetch(base+'/sitemap.xml')).text();assert.ok(!sitemap.includes('<loc>'));
console.log('PASS: private review robots/sitemap and receipt uploads fail closed');
