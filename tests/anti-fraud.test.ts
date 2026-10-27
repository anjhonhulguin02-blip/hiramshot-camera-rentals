import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {normalizePhilippineMobile,validateEmergencyContacts,validateReviewAcknowledgement,hasCompleteKyc,DOCUMENT_KINDS,VIDEO_REVIEW_ACKNOWLEDGEMENT} from '../lib/verification';
import {CONSUME_LIMIT_SQL,requestLimitBindings,UNVERIFIED_BOOKING_LIMIT,FILE_UPLOAD_LIMIT} from '../lib/request-limits';
import {ANTI_PAWNING_CLAUSE,ANTI_FRAUD_ACKNOWLEDGEMENT,POLICY_VERSION} from '../lib/policies';
test('Philippine mobile formats normalize and emergency contacts cannot use aliases of the renter number',()=>{
 for(const input of ['09171234567','+639171234567','639171234567','0917 123 4567'])assert.equal(normalizePhilippineMobile(input),'+639171234567');
 for(const input of ['+12025550123','0999','091712345678','0917abc4567','(02)81234567',null])assert.throws(()=>normalizePhilippineMobile(input));
 assert.throws(()=>validateEmergencyContacts('09171234567','Test Contact','Sibling','+639171234567'));
 assert.throws(()=>validateEmergencyContacts('09171234567','','Sibling','09181234567'));
 assert.throws(()=>validateEmergencyContacts('09171234567','Test Contact','','09181234567'));
 assert.equal(validateEmergencyContacts('09171234567','Test Contact','Sibling','09181234567').emergencyPhone,'+639181234567');
});
test('all five distinct clean documents and completed review are required',()=>{
 const docs=DOCUMENT_KINDS.map((kind,i)=>({kind,scan_status:'CLEAN',sha256:String(i).repeat(64),reviewed_at:'2026-10-27T00:00:00Z',deleted_at:null as string|null}));
 assert.equal(hasCompleteKyc(docs,true),true);
 for(let missing=0;missing<5;missing++)assert.equal(hasCompleteKyc(docs.filter((_,i)=>i!==missing),true),false);
 assert.equal(hasCompleteKyc([...docs.slice(0,4),docs[0]],true),false);
 assert.equal(hasCompleteKyc(docs.map((d,i)=>i?d:{...d,scan_status:'LEGACY_REVIEW_REQUIRED'}),true),false);
 assert.equal(hasCompleteKyc(docs.map((d,i)=>i?d:{...d,deleted_at:'deleted'}),true),false);
 assert.equal(hasCompleteKyc(docs.map((d,i)=>i?d:{...d,reviewed_at:undefined}),true),false);
 assert.ok(VIDEO_REVIEW_ACKNOWLEDGEMENT.includes('verified their physical ID matches'));
});
function limiter(){const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE request_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL)');const statement=db.prepare(CONSUME_LIMIT_SQL);let nonce=0;return{db,consume:(account:string,ip:string,now:number,policy=UNVERIFIED_BOOKING_LIMIT)=>Number(statement.run(...requestLimitBindings(policy.scope+':account:'+account+':',policy.scope+':ip:'+ip+':',policy,now,String(nonce++))).changes)};}
test('the fourth unverified booking is rejected in a rolling hour, without a fixed-hour reset loophole',()=>{
 const limit=limiter();assert.equal(limit.consume('a','one',3598),2);assert.equal(limit.consume('a','one',3599),2);assert.equal(limit.consume('a','one',3600),2);assert.equal(limit.consume('a','one',3601),0);assert.equal(limit.consume('a','one',7197),0);assert.equal(limit.consume('a','one',7198),2);limit.db.close();
});
test('upload quota counts both account and IP atomically and is shared by document and receipt routes',()=>{
 const limit=limiter();for(let i=0;i<10;i++)assert.equal(limit.consume('a','shared',100+i,FILE_UPLOAD_LIMIT),2);
 assert.equal(limit.consume('a','new-ip',120,FILE_UPLOAD_LIMIT),0);
 assert.equal(limit.consume('other-account','shared',120,FILE_UPLOAD_LIMIT),0);
 assert.equal((limit.db.prepare('SELECT COUNT(*) AS count FROM request_limits').get() as {count:number}).count,20);
 assert.equal(limit.consume('other-account','new-ip',120,FILE_UPLOAD_LIMIT),2);limit.db.close();
});
test('updated legal acknowledgement retains the prohibition and restricted evidence handling',()=>{
 assert.ok(ANTI_PAWNING_CLAUSE.startsWith('Sub-leasing, lending to third parties, or pawning the equipment is strictly prohibited.'));
 assert.ok(ANTI_PAWNING_CLAUSE.includes('24 hours'));
 assert.ok(!ANTI_PAWNING_CLAUSE.includes('Carnapping of Equipment'));
 assert.ok(ANTI_FRAUD_ACKNOWLEDGEMENT.includes('must not publish my identification documents'));
 assert.equal(POLICY_VERSION,'2026-10-27-security-v2');
});

test('live video and physical document review cannot be bypassed with omitted fields or truthy strings',()=>{for(const value of [{},{videoCallCompleted:true},{documentsReviewed:true},{videoCallCompleted:'true',documentsReviewed:true},{videoCallCompleted:true,documentsReviewed:'on'}])assert.throws(()=>validateReviewAcknowledgement(value));assert.doesNotThrow(()=>validateReviewAcknowledgement({videoCallCompleted:true,documentsReviewed:true}));});
