import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {deflateSync} from 'node:zlib';
import * as client from '../app/api/account/verification/route';
import * as upload from '../app/api/account/verification/documents/route';
import * as bookingUpload from '../app/api/bookings/[id]/documents/route';
import * as review from '../app/api/admin/verifications/[id]/route';
import * as queue from '../app/api/admin/verifications/route';
import * as preview from '../app/api/admin/documents/[id]/preview/route';
import * as download from '../app/api/documents/[id]/route';
import {attachAccountVerification} from '../lib/account-verification';
import {purgeExpired} from '../lib/purge';
import {base64,mac} from '../lib/security';
import {DOCUMENT_KINDS} from '../lib/verification';

const state=globalThis as unknown as {hiramshotTestEnv:any;hiramshotTestUser:any},env=state.hiramshotTestEnv;
const origin='https://example.invalid',people={renter:{userId:'email:synthetic-renter',email:'renter@example.invalid',fullName:'Synthetic Renter',displayName:'Synthetic Renter'},other:{userId:'email:synthetic-other',email:'other@example.invalid',fullName:'Synthetic Other',displayName:'Synthetic Other'},admin:{userId:'email:synthetic-admin',email:'owner@example.invalid',fullName:'Synthetic Owner',displayName:'Synthetic Owner'}};
const personal={fullName:'Synthetic Renter',address:'Synthetic address for test only',mobile:'09170000001',socialLink:'https://example.invalid/synthetic-profile',occupation:'Synthetic fixture',emergencyName:'Synthetic Contact',emergencyRelationship:'Sibling',emergencyPhone:'09170000002',videoCall:'2099-01-01T10:00',pickupMethod:'Self-pickup'};
function png(value:number,width=800,height=600){
 function crc(bytes:Uint8Array){let sum=0xffffffff;for(const byte of bytes){sum^=byte;for(let bit=0;bit<8;bit++)sum=(sum>>>1)^((sum&1)?0xedb88320:0);}return (sum^0xffffffff)>>>0;}
 function chunk(type:string,bytes:Uint8Array){const data=Buffer.concat([Buffer.from(type),bytes]),size=Buffer.alloc(4),hash=Buffer.alloc(4);size.writeUInt32BE(bytes.length);hash.writeUInt32BE(crc(data));return Buffer.concat([size,data,hash]);}
 const header=Buffer.from([0,0,0,0,0,0,0,0,8,2,0,0,0]);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);const pixels=Buffer.alloc(height*(1+width*3));for(let y=0;y<height;y++)for(let x=0;x<width;x++){const offset=y*(1+width*3)+1+x*3;pixels[offset]=value;pixels[offset+1]=90;pixels[offset+2]=150;}return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
}
function fixture(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');for(const name of readdirSync('drizzle').filter(name=>name.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+name,'utf8').replace(/^\uFEFF/,''));
 const db={prepare(sql:string){return {sql,values:[] as unknown[],bind(...values:unknown[]){this.values=values;return this;},async run(){const result=sqlite.prepare(this.sql).run(...this.values as any[]);return {success:true,meta:{changes:Number(result.changes)}};},async first(column?:string){const row=sqlite.prepare(this.sql).get(...this.values as any[]);return column?row?.[column]??null:row??null;},async all(){return {success:true,results:sqlite.prepare(this.sql).all(...this.values as any[])};}};},async batch(statements:any[]){sqlite.exec('BEGIN');try{const result=statements.map(statement=>({success:true,meta:{changes:Number(sqlite.prepare(statement.sql).run(...statement.values).changes)}}));sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
 const objects=new Map<string,Uint8Array>();let infected=false,deleteFailure=false;
 Object.assign(env,{DB:db,BUCKET:{async put(key:string,bytes:Uint8Array){objects.set(key,new Uint8Array(bytes));},async get(key:string){const bytes=objects.get(key);return bytes?{size:bytes.length,body:new Response(bytes as BodyInit).body,async arrayBuffer(){return bytes.slice().buffer;}}:null;},async delete(key:string){if(deleteFailure)throw new Error('Synthetic object-store interruption');objects.delete(key);}},KYC_ENABLED:'true',DATA_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64'),ADMIN_SESSION_SECRET:'synthetic-session-secret-'.repeat(3),AUDIT_HMAC_KEY:'synthetic-audit-secret-'.repeat(3),DOWNLOAD_SECRET:'synthetic-download-secret-'.repeat(3),ADMIN_ACCESS_EMAILS:people.admin.email,TURNSTILE_SITE_KEY:'synthetic-site-key',TURNSTILE_SECRET_KEY:'synthetic-challenge-secret',MALWARE_SCANNER_TOKEN:'synthetic-scanner-token-'.repeat(3),MALWARE_SCANNER:{async fetch(request:Request){const bytes=new Uint8Array(await request.arrayBuffer()),sha256=Buffer.from(await crypto.subtle.digest('SHA-256',bytes)).toString('hex');return Response.json({clean:!infected,sha256},{status:infected?422:200});}}});
 for(const [id,user]of Object.entries(people))sqlite.prepare('INSERT INTO users(id,auth_user_id,role,full_name,email,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run(id,user.userId,id==='admin'?'ADMIN':'CLIENT',user.fullName,user.email,'test','test');
 state.hiramshotTestUser=people.renter;
 return {sqlite,objects,infected(value:boolean){infected=value;},deleteFailure(value:boolean){deleteFailure=value;}};
}
function request(path:string,body:unknown,method='PATCH',cookie=''){return new Request(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});}
function ctx(id:string){return {params:Promise.resolve({id})};}
async function cookie(){const payload=base64(new TextEncoder().encode(JSON.stringify({uid:people.admin.userId,exp:Date.now()+60000})));return '__Host-hiramshot-admin='+encodeURIComponent(payload+'~'+await mac(payload,env.ADMIN_SESSION_SECRET));}
async function save(){return client.PATCH(request('/api/account/verification',{action:'personal',personal,sensitiveConsent:true,turnstileToken:'synthetic-verification'}));}
async function send(kind:string,index:number,token='synthetic-upload',options:{idType?:string;captureSource?:string;width?:number;height?:number;bookingId?:string}={}){
 const body=new FormData();body.set('kind',kind);body.set('idType',options.idType??({'government-id-1':'drivers-license','government-id-2':'national-id','company-school-id':'school-id'}[kind]||''));body.set('captureSource',options.captureSource??'camera');body.set('file',new File([png(index,options.width,options.height)],'synthetic.png',{type:'image/png'}));body.set('turnstileToken',token);
 const path=options.bookingId?'/api/bookings/'+options.bookingId+'/documents':'/api/account/verification/documents',req=new Request(origin+path,{method:'POST',headers:{Origin:origin},body});return options.bookingId?bookingUpload.POST(req,ctx(options.bookingId)):upload.POST(req);
}
function booking(sqlite:DatabaseSync,userId:string,id=crypto.randomUUID()){
 sqlite.prepare("INSERT INTO bookings(id,user_id,request_key,start_date,end_date,days,items,quote,status,contact,created_at,updated_at,client_id,lifecycle_status) VALUES (?,?,?,'2099-01-01','2099-01-02',1,'[]','{}','requested','synthetic-encrypted-contact','test','test',?,'PENDING_KYC_REVIEW')").run(id,userId,crypto.randomUUID(),userId===people.renter.userId?'renter':'other');return id;
}
test('pre-booking requirements enforce scoped uploads, review, transfer and retention',async t=>{
 const originalFetch=globalThis.fetch;globalThis.fetch=async input=>{if(String(input).includes('challenges.cloudflare.com'))throw new Error('Unexpected Turnstile request shape');throw new Error('Unexpected network request');};
 globalThis.fetch=async(input,options)=>{if(String(input)==='https://challenges.cloudflare.com/turnstile/v0/siteverify'){const body=JSON.parse(String(options?.body));return Response.json({success:['synthetic-verification','synthetic-upload'].includes(body.response),hostname:'example.invalid',action:body.response==='synthetic-upload'?'upload':'verification'});}throw new Error('Unexpected external request');};
 try{
  await t.test('uploads require saved consent, real challenge validation and a clean byte-bound verdict',async()=>{
   const f=fixture();assert.equal((await send(DOCUMENT_KINDS[0],1)).status,409);assert.equal((await save()).status,201);
   assert.equal((await send(DOCUMENT_KINDS[0],1,'')).status,400);assert.equal(f.objects.size,0);
   f.infected(true);assert.equal((await send(DOCUMENT_KINDS[0],1)).status,400);assert.equal(f.objects.size,0);f.infected(false);
   const first=await send(DOCUMENT_KINDS[0],1);assert.equal(first.status,201);assert.equal(f.objects.size,1);
   assert.equal((await send(DOCUMENT_KINDS[1],1)).status,409);assert.equal(f.objects.size,1);
   assert.throws(()=>f.sqlite.prepare("UPDATE account_verifications SET status='APPROVED',verified_at='test',reviewed_by='admin'").run(),/Five reviewed documents/);
   state.hiramshotTestUser=people.other;assert.equal((await client.GET()).status,200);assert.equal((await (await client.GET()).json() as any).verification,null);assert.equal((await send(DOCUMENT_KINDS[1],2)).status,409);f.sqlite.close();
  });
  await t.test('ID type, distinct government IDs and minimum photo size are enforced on the server',async()=>{
   const f=fixture();await save();
   for(const options of [{idType:''},{idType:'invented-id'},{captureSource:'verified-by-client'},{width:1,height:1}])assert.equal((await send(DOCUMENT_KINDS[0],1,'synthetic-upload',options)).status,400);
   assert.equal(f.objects.size,0);const received=await send(DOCUMENT_KINDS[0],1);assert.equal(received.status,201);assert.equal((await received.json() as any).status,'RECEIVED_FOR_MANUAL_REVIEW');
   assert.equal((await send(DOCUMENT_KINDS[1],2,'synthetic-upload',{idType:'drivers-license'})).status,409);assert.equal((await send(DOCUMENT_KINDS[1],2)).status,201);
   assert.equal(f.sqlite.prepare('SELECT id_type FROM account_verification_documents WHERE kind=?').get(DOCUMENT_KINDS[0])?.id_type,'drivers-license');f.sqlite.close();
  });
  await t.test('unreviewed retakes replace the private file and failed object cleanup retries without deleting active files',async()=>{
   const f=fixture();await save();assert.equal((await send(DOCUMENT_KINDS[0],1)).status,201);const old=f.sqlite.prepare('SELECT object_key FROM account_verification_documents').get()?.object_key as string;
   assert.equal((await send(DOCUMENT_KINDS[0],2)).status,201);assert.equal(f.objects.has(old),false);assert.equal(f.objects.size,1);
   const previous=f.sqlite.prepare('SELECT object_key FROM account_verification_documents').get()?.object_key as string;f.deleteFailure(true);assert.equal((await send(DOCUMENT_KINDS[0],3)).status,201);assert.equal(f.objects.size,2);assert.equal(f.sqlite.prepare('SELECT object_key FROM kyc_object_cleanup').get()?.object_key,previous);
   const active=f.sqlite.prepare('SELECT object_key FROM account_verification_documents').get()?.object_key as string;f.sqlite.prepare('INSERT INTO kyc_object_cleanup VALUES (?,?)').run(active,'test');f.deleteFailure(false);await purgeExpired(env);assert.equal(f.objects.has(previous),false);assert.equal(f.objects.has(active),true);assert.equal(f.objects.size,1);
   f.sqlite.prepare("UPDATE account_verification_documents SET reviewed_at='test',reviewed_by='admin'").run();assert.equal((await send(DOCUMENT_KINDS[0],4)).status,409);f.sqlite.close();
  });
  await t.test('booking capture uses the same server validation and ownership checks',async()=>{
   const f=fixture(),id=booking(f.sqlite,people.renter.userId);f.sqlite.prepare("UPDATE bookings SET personal='synthetic-personal' WHERE id=?").run(id);
   assert.equal((await send(DOCUMENT_KINDS[0],1,'synthetic-upload',{bookingId:id,idType:''})).status,400);assert.equal((await send(DOCUMENT_KINDS[0],1,'synthetic-upload',{bookingId:id})).status,201);
   assert.equal((await send(DOCUMENT_KINDS[1],2,'synthetic-upload',{bookingId:id,idType:'drivers-license'})).status,409);
   state.hiramshotTestUser=people.other;assert.equal((await send(DOCUMENT_KINDS[1],2,'synthetic-upload',{bookingId:id})).status,404);assert.equal(f.objects.size,1);f.sqlite.close();
  });
  await t.test('parallel retakes cannot overwrite a newer photo or leave an untracked private object',async()=>{
   for(const scope of ['account','booking']){
    const f=fixture();await save();const options=scope==='booking'?{bookingId:booking(f.sqlite,people.renter.userId)}:{};if(options.bookingId)f.sqlite.prepare("UPDATE bookings SET personal='synthetic-personal' WHERE id=?").run(options.bookingId);
    assert.equal((await send(DOCUMENT_KINDS[0],1,'synthetic-upload',options)).status,201);
    const original=env.MALWARE_SCANNER.fetch;let count=0,release=()=>{};const barrier=new Promise<void>(resolve=>{release=resolve;});env.MALWARE_SCANNER.fetch=async(request:Request)=>{if(++count===2)release();await barrier;return original(request);};
    const results=await Promise.all([send(DOCUMENT_KINDS[0],2,'synthetic-upload',options),send(DOCUMENT_KINDS[0],3,'synthetic-upload',options)]);assert.deepEqual(results.map(result=>result.status).sort(),[201,409]);assert.equal(f.objects.size,1);const table=scope==='account'?'account_verification_documents':'kyc_documents',key=f.sqlite.prepare('SELECT object_key FROM '+table).get()?.object_key as string;assert.ok(f.objects.has(key));assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM kyc_object_cleanup').get()?.n,0);f.sqlite.close();
   }
  });
  await t.test('approval needs all five files, both acknowledgements, current version and administrator MFA',async()=>{
   const f=fixture();assert.equal((await save()).status,201);const row=f.sqlite.prepare('SELECT * FROM account_verifications').get() as any;
   state.hiramshotTestUser=people.admin;const session=await cookie();assert.equal((await queue.GET(new Request(origin+'/api/admin/verifications'))).status,403);
   assert.equal((await review.POST(request('/api/admin/verifications/'+row.id,{action:'approve',reviewVersion:0,documentsReviewed:true,videoCallCompleted:true},'POST',session),ctx(row.id))).status,409);
   state.hiramshotTestUser=people.renter;for(let i=0;i<5;i++)assert.equal((await send(DOCUMENT_KINDS[i],i+1)).status,201);
   const full=f.sqlite.prepare('SELECT * FROM account_verifications').get() as any,doc=f.sqlite.prepare('SELECT id FROM account_verification_documents LIMIT 1').get() as any;
   state.hiramshotTestUser=people.admin;
   const approve=(version:number,call:boolean)=>review.POST(request('/api/admin/verifications/'+row.id,{action:'approve',reviewVersion:version,documentsReviewed:true,videoCallCompleted:call},'POST',session),ctx(row.id));
   assert.equal((await approve(full.version,false)).status,400);assert.equal((await approve(0,true)).status,409);
   assert.equal((await approve(full.version,true)).status,200);
   assert.equal((await preview.GET(new Request(origin+'/api/admin/documents/'+doc.id+'/preview',{headers:{Cookie:session}}),ctx(doc.id))).status,200);
   const signed=await download.POST(request('/api/documents/'+doc.id,{},'POST',session),ctx(doc.id));assert.equal(signed.status,200);const signedUrl=(await signed.json() as any).url;
   state.hiramshotTestUser=people.other;assert.equal((await download.GET(new Request(origin+signedUrl),ctx(doc.id))).status,403);
   state.hiramshotTestUser=people.renter;const wrong=booking(f.sqlite,people.other.userId);assert.equal(await attachAccountVerification(request('/api/account/verification',{}),'renter',people.renter.userId,wrong),false);
   const id=booking(f.sqlite,people.renter.userId);assert.equal(await attachAccountVerification(request('/api/account/verification',{}),'renter',people.renter.userId,id),true);
   assert.equal(f.sqlite.prepare('SELECT status FROM bookings WHERE id=?').get(id)?.status,'verified');assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM kyc_documents WHERE booking_id=?').get(id)?.n,5);assert.equal(f.objects.size,5);assert.equal(f.sqlite.prepare('SELECT id_type FROM kyc_documents WHERE booking_id=? AND kind=?').get(id,DOCUMENT_KINDS[0])?.id_type,'drivers-license');
   assert.equal(f.sqlite.prepare('SELECT personal FROM account_verifications').get()?.personal,null);
   const second=booking(f.sqlite,people.renter.userId);assert.equal(await attachAccountVerification(request('/api/account/verification',{}),'renter',people.renter.userId,second),false);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM kyc_documents WHERE booking_id=?').get(second)?.n,0);f.sqlite.close();
  });
  await t.test('replacement invalidates approval and partial files transfer once without retaining a second object copy',async()=>{
   const f=fixture();await save();for(let i=0;i<5;i++)assert.equal((await send(DOCUMENT_KINDS[i],i+1)).status,201);
   const row=f.sqlite.prepare('SELECT * FROM account_verifications').get() as any,doc=f.sqlite.prepare('SELECT id FROM account_verification_documents LIMIT 1').get() as any;
   state.hiramshotTestUser=people.admin;const session=await cookie();
   const approval={action:'approve',reviewVersion:row.version,documentsReviewed:true,videoCallCompleted:true};
   assert.equal((await review.POST(request('/api/admin/verifications/'+row.id,approval,'POST',session),ctx(row.id))).status,200);
   assert.equal((await download.DELETE(request('/api/documents/'+doc.id,{},'DELETE',session),ctx(doc.id))).status,200);assert.equal(f.objects.size,4);
   assert.equal(f.sqlite.prepare('SELECT status FROM account_verifications').get()?.status,'PENDING');assert.equal(f.sqlite.prepare("SELECT kyc_status FROM users WHERE id='renter'").get()?.kyc_status,'UNVERIFIED');
   assert.equal((await review.POST(request('/api/admin/verifications/'+row.id,approval,'POST',session),ctx(row.id))).status,409);
   state.hiramshotTestUser=people.renter;const id=booking(f.sqlite,people.renter.userId);assert.equal(await attachAccountVerification(request('/api/account/verification',{}),'renter',people.renter.userId,id),true);
   const booked=f.sqlite.prepare('SELECT * FROM bookings WHERE id=?').get(id);assert.equal(booked?.status,'verification');assert.equal(booked?.verified_at,null);assert.equal(f.sqlite.prepare('SELECT COUNT(*) AS n FROM kyc_documents WHERE booking_id=?').get(id)?.n,4);
   f.sqlite.prepare("UPDATE account_verifications SET expires_at='2000-01-01T00:00:00.000Z'").run();await purgeExpired(env);assert.equal(f.objects.size,4,'linked requirements must follow booking retention');
   f.sqlite.prepare("UPDATE bookings SET status='cancelled',purge_at='2000-01-01T00:00:00.000Z' WHERE id=?").run(id);const cleared=await purgeExpired(env);assert.equal(cleared.purged,1);assert.equal(f.objects.size,0);assert.equal(f.sqlite.prepare('SELECT personal FROM bookings WHERE id=?').get(id)?.personal,null);f.sqlite.close();
  });
  await t.test('account uploads retain the shared ten-attempt account/IP limit',async()=>{
   const f=fixture();await save();assert.equal((await send(DOCUMENT_KINDS[0],1)).status,201);for(let i=0;i<9;i++)assert.equal((await send(DOCUMENT_KINDS[1],1)).status,409);
   assert.equal((await send(DOCUMENT_KINDS[1],2)).status,429);state.hiramshotTestUser=people.other;await save();assert.equal((await send(DOCUMENT_KINDS[0],3)).status,429);assert.equal(f.objects.size,1);f.sqlite.close();
  });
  await t.test('expired unlinked files are claimed before deletion and interrupted purge safely retries',async()=>{
   const f=fixture();assert.equal((await save()).status,201);assert.equal((await send(DOCUMENT_KINDS[0],1)).status,201);f.sqlite.prepare("UPDATE account_verifications SET expires_at='2000-01-01T00:00:00.000Z'").run();
   assert.equal((await (await client.GET()).json() as any).verification,null);assert.equal((await send(DOCUMENT_KINDS[1],2)).status,409);
   f.deleteFailure(true);await assert.rejects(purgeExpired(env));assert.equal(f.sqlite.prepare('SELECT status FROM account_verifications').get()?.status,'PURGING');assert.equal(f.objects.size,1);
   f.deleteFailure(false);const result=await purgeExpired(env);assert.equal(result.accountVerificationsPurged,1);assert.equal(f.objects.size,0);assert.equal(f.sqlite.prepare('SELECT personal FROM account_verifications').get()?.personal,null);assert.equal(f.sqlite.prepare('SELECT status FROM account_verifications').get()?.status,'PURGED');f.sqlite.close();
  });
 }finally{globalThis.fetch=originalFetch;state.hiramshotTestUser=null;}
});
