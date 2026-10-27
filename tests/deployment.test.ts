import test from 'node:test';
import assert from 'node:assert/strict';
import {D1HttpDatabase} from '../lib/runtime/d1-http';
import {safeReturnPath,googlePrincipal} from '../lib/identity/navigation';
import {trustedClientIp} from '../lib/client-ip';
import {canonicalRequest} from '../lib/trusted-request';
const config={accountId:'a'.repeat(32),databaseId:'00000000-0000-4000-8000-000000000001',token:'SYNTHETIC_SERVER_CREDENTIAL'};
test('D1 binds values separately and sends a batch in one authenticated server request',async()=>{
 const calls:{url:string;options:RequestInit}[]=[];
 const db=new D1HttpDatabase({...config,fetch:async(url,options)=>{calls.push({url:String(url),options:options!});const queries=JSON.parse(String(options!.body));return Response.json({success:true,result:(queries.batch??[queries]).map(()=>({success:true,results:[{count:1}],meta:{changes:1}}))});}});
 const text="' OR 1=1 --";const result=await db.batch([db.prepare('SELECT ? AS count').bind(text),db.prepare('SELECT ? AS count').bind(3)]);
 assert.equal(calls.length,1);assert.equal(result.length,2);assert.equal(new Headers(calls[0].options.headers).get('Authorization'),'Bearer '+config.token);
 assert.deepEqual(JSON.parse(String(calls[0].options.body)),{batch:[{sql:'SELECT ? AS count',params:[text]},{sql:'SELECT ? AS count',params:[3]}]});
 assert.equal(calls[0].options.cache,'no-store');assert.throws(()=>db.prepare('SELECT ?').bind(undefined));
});
test('D1 never retries uncertain writes and rejects partial or malformed results',async()=>{
 let calls=0;const broken=new D1HttpDatabase({...config,fetch:async()=>{calls++;throw new Error('Synthetic transport failure');}});
 await assert.rejects(broken.prepare('INSERT INTO example VALUES (?)').bind(1).run());assert.equal(calls,1);
 const malformed=new D1HttpDatabase({...config,fetch:async()=>Response.json({success:true,result:[{success:true,results:[],meta:{}}]})});await assert.rejects(malformed.prepare('SELECT 1').all(),/metadata/);
 const denied=new D1HttpDatabase({...config,fetch:async()=>Response.json({success:false,errors:[{message:'UNIQUE constraint failed: synthetic'}]},{status:400})});await assert.rejects(denied.prepare('SELECT 1').all(),/UNIQUE/);
});
test('Google identities require verified email and stable provider subject',()=>{
 const profile={sub:'123456',email:'OWNER@example.invalid',email_verified:true,name:'Synthetic Owner'};
 assert.equal(googlePrincipal(profile)?.userId,'google:123456');assert.equal(googlePrincipal(profile)?.email,'owner@example.invalid');
 for(const candidate of [{...profile,email_verified:false},{...profile,email_verified:'true'},{...profile,sub:''},{...profile,email:''},{}])assert.equal(googlePrincipal(candidate),null);
});
test('authentication return paths cannot leave the app or recurse into auth routes',()=>{
 for(const value of ['https://evil.invalid','//evil.invalid','/\\evil.invalid','/login','/logout','/api/auth/callback/google','/signin-with-chatgpt','/\n/evil.invalid'])assert.equal(safeReturnPath(value),'/account');
 assert.equal(safeReturnPath('/book?gear=x5'),'/book?gear=x5');
});
test('Vercel ignores Cloudflare and Sites identity headers for IP rate limits',()=>{
 const request=new Request('https://example.invalid',{headers:{'cf-connecting-ip':'1.2.3.4','x-forwarded-for':'203.0.113.10','oai-authenticated-user-id':'forged'}});
 assert.equal(trustedClientIp(request,'vercel',false,true),'203.0.113.10');assert.equal(trustedClientIp(request,'vercel',false,false),'unavailable');assert.equal(trustedClientIp(request,'sites',false,false),'1.2.3.4');
});
test('the trusted request origin replaces attacker-supplied OAuth forwarding headers',()=>{
 const original=new Request('https://hiramshot.com/api/auth/signin/google',{headers:{Host:'hiramshot.com','x-forwarded-host':'attacker.invalid','x-forwarded-proto':'http',Forwarded:'host=attacker.invalid;proto=http',Cookie:'synthetic=session'}}),trusted=canonicalRequest(original);
 assert.equal(trusted.headers.get('x-forwarded-host'),'hiramshot.com');assert.equal(trusted.headers.get('x-forwarded-proto'),'https');assert.equal(trusted.headers.has('forwarded'),false);assert.equal(trusted.headers.get('cookie'),'synthetic=session');
});
