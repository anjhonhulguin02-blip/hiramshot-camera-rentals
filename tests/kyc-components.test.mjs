import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import KycReview from '../app/admin/kyc-review.tsx';
import Registration from '../app/signup/registration.tsx';
import Wizard from '../app/book/wizard.tsx';
import {DOCUMENT_KINDS,VIDEO_REVIEW_ACKNOWLEDGEMENT} from '../lib/verification.ts';
import {INITIAL_CATALOG} from '../lib/catalog.ts';

const render=(component,props)=>renderToStaticMarkup(React.createElement(component,props));
test('approval dialog requires all five clean files and both review acknowledgements',()=>{
 const documents=DOCUMENT_KINDS.map((kind,i)=>({id:String(i),kind,deleted_at:null,scan_status:'CLEAN',sha256:String(i).repeat(64),id_type:i===0?'drivers-license':i===1?'national-id':null}));
 const html=render(KycReview,{documents,busy:false,version:7,onApprove:async()=>true});
 assert.equal((html.match(/File received/g)||[]).length,5);
 assert.ok(html.includes(VIDEO_REVIEW_ACKNOWLEDGEMENT));
 for(const name of ['documentsReviewed','videoCallCompleted'])assert.ok(html.match(new RegExp('<input[^>]*name="'+name+'"[^>]*>'))?.[0].includes('required=""'));
 assert.ok(html.includes('name="reviewVersion" value="7"'));
 for(let i=0;i<5;i++){
  const missing=render(KycReview,{documents:documents.filter((_,j)=>i!==j),busy:false,version:7,onApprove:async()=>true});
  assert.ok(missing.includes('disabled="">Approve KYC &amp; video review'));
 }
});
test('registration requires emergency details and stays disabled without a security challenge',()=>{
 const html=render(Registration,{name:'Synthetic Client',email:'synthetic@example.invalid'});
 for(const field of ['fullName','mobileNumber','emergencyContactName','emergencyContactRelationship','emergencyContactNumber']){
  const input=html.match(new RegExp('<input[^>]*name="'+field+'"[^>]*>'))?.[0];
  assert.ok(input?.includes('required=""'),field);
 }
 assert.ok(html.includes('disabled="">Create HiramShot account'));
});
test('booking requires anti-fraud consent and has no courier option for a first rental',()=>{
 const html=render(Wizard,{catalog:INITIAL_CATALOG,user:{name:'Synthetic Client',email:'synthetic@example.invalid'},initial:{gear:'x5',start:'2026-11-01',end:'2026-11-02'}});
 assert.ok(html.match(/<input[^>]*name="antiFraudConsent"[^>]*>/)?.[0].includes('required=""'));
 const methods=html.match(/<select name="turnoverMethod">([\s\S]*?)<\/select>/)?.[1];
 assert.ok(methods?.includes('SELF_PICKUP_NORZAGARAY'));
 assert.ok(methods?.includes('MEETUP'));
 assert.ok(!/courier|grab|lalamove/i.test(methods));
});
