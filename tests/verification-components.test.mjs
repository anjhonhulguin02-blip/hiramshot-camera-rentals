import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import Verification from '../app/book/verification-form.tsx';
import DocumentCapture from '../app/book/document-capture.tsx';
import {DOCUMENT_KINDS} from '../lib/verification.ts';
import {nextDocumentKind} from '../lib/document-flow.ts';
const booking={id:'00000000-0000-4000-8000-000000000001',personal:null};
const config={turnstileSiteKey:null,kycEnabled:false,contactEmail:'business@example.invalid',uploadMaxBytes:5242880};
test('unavailable verification explains the actual service blocker next to the disabled save action',()=>{const html=renderToStaticMarkup(React.createElement(Verification,{booking,docs:[],config,profile:{},reload:async()=>{}}));assert.ok(html.includes('This is a website setup issue, not an error in your entries.'));assert.ok(html.includes('Verification temporarily unavailable'));assert.ok(html.includes('mailto:business@example.invalid'));assert.ok(html.includes('0 of 9 required details complete'));assert.ok(html.includes('noValidate=""'));assert.ok(html.includes('aria-describedby="verification-mobile-hint"'));assert.match(html,/<button[^>]*disabled=""[^>]*>Verification temporarily unavailable/);assert.ok(!html.includes('STEP 2 OF 2'));assert.ok(!html.includes('type="file"'));});
test('saved verification opens guided document capture alone with clear receipt status and editable details',()=>{const html=renderToStaticMarkup(React.createElement(Verification,{booking:{...booking,personal:{fullName:'Synthetic Renter'}},docs:[{kind:'government-id-1',deleted_at:null,scan_status:'CLEAN',id_type:'drivers-license'}],config,profile:{},reload:async()=>{}}));assert.ok(html.includes('1 of 5 files received'));assert.ok(html.includes('Valid government ID 2'));assert.ok(html.includes('Photo needed'));assert.ok(html.includes('Document submission is paused'));assert.ok(html.includes('STEP 2 OF 2'));assert.ok(!html.includes('STEP 1 OF 2'));assert.ok(!html.includes('name="fullName"'));assert.ok(!html.includes('Save details &amp; continue'));assert.ok(html.includes('Edit details'));assert.ok(html.includes('Scan ID with camera'));assert.ok(html.includes('Government ID type'));assert.ok(html.includes('PhilHealth ID'));assert.ok(html.includes('File received does not mean ID verified'));assert.ok(html.includes('capture="environment"'));assert.ok(html.includes('playsInline=""')||html.includes('playsinline=""'));assert.ok(html.includes('Review / retake'));assert.equal((html.match(/type="file"/g)||[]).length,2);assert.ok(html.match(/<option value="drivers-license"[^>]*>/)?.[0].includes('disabled=""'));});
test('account verification explains pre-booking uploads and the unlinked seven-day expiry',()=>{const html=renderToStaticMarkup(React.createElement(Verification,{scope:'account',booking,docs:[],config:{...config,kycEnabled:true},profile:{},reload:async()=>{}}));assert.ok(html.includes('You can choose your gear and dates later.'));assert.ok(html.includes('deletion after seven days if these requirements are not linked to a rental request'));assert.ok(html.includes('Save details &amp; continue'));assert.ok(!html.includes('STEP 2 OF 2'));});

const receivedDoc=(kind)=>({id:'synthetic-'+kind,kind,deleted_at:null,scan_status:'CLEAN',id_type:kind==='government-id-1'?'drivers-license':kind==='government-id-2'?'national-id':kind==='company-school-id'?'school-id':null});
const capture=(docs)=>renderToStaticMarkup(React.createElement(DocumentCapture,{bookingId:booking.id,scope:'account',docs,config:{...config,kycEnabled:true},reload:async()=>{},onBusyChange(){}}));
const button=(html,label)=>[...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map(match=>match[0]).find(markup=>markup.includes(label));

test('after the first ID, camera and file selection stay enabled before choosing the second ID type',()=>{
 const html=capture([receivedDoc('government-id-1')]);
 assert.match(html,/<option value="government-id-2" selected=""/);
 assert.ok(!button(html,'Scan ID with camera').split('>')[0].includes('disabled'));
 assert.ok(!html.match(/<input[^>]*id="capture-file"[^>]*>/)[0].includes('disabled'));
 assert.ok(button(html,'Choose ID type above to submit').split('>')[0].includes('disabled'));
 assert.ok(html.includes('You can scan or choose a photo now.'));
 assert.ok(html.includes('Your other government ID is Driver’s License (LTO)'));
 assert.ok(html.match(/<option value="drivers-license"[^>]*>/)[0].includes('disabled'));
});

test('every remaining requirement stays selectable as receipt progress advances and reviewed files remain locked',()=>{
 for(let count=0;count<DOCUMENT_KINDS.length;count++){
  const docs=DOCUMENT_KINDS.slice(0,count).map(receivedDoc),html=capture(docs);
  assert.ok(!html.match(/<input[^>]*id="capture-file"[^>]*>/)[0].includes('disabled'));
  assert.equal(nextDocumentKind(docs),DOCUMENT_KINDS[count]);
  assert.equal(nextDocumentKind(docs,DOCUMENT_KINDS[count]),DOCUMENT_KINDS[count+1]);
 }
 const complete=DOCUMENT_KINDS.map(receivedDoc);assert.equal(nextDocumentKind(complete),undefined);
 assert.equal(nextDocumentKind(complete.map(doc=>doc.kind==='government-id-2'?{...doc,deleted_at:'synthetic-deletion'}:doc)),'government-id-2');
 const html=capture(complete.map(doc=>({...doc,reviewed_at:'synthetic-reviewed'})));
 assert.ok(button(html,'Scan ID with camera').split('>')[0].includes('disabled'));
 assert.ok(html.match(/<input[^>]*id="capture-file"[^>]*>/)[0].includes('disabled'));
 assert.ok(html.includes('This document was already reviewed'));
});

test('the requirements form advertises the configured 10 MB cap and respects smaller adapter limits',()=>{
 for(const size of [10485760,4194304]){
  const html=renderToStaticMarkup(React.createElement(DocumentCapture,{bookingId:booking.id,scope:'account',docs:[],config:{...config,kycEnabled:true,uploadMaxBytes:size},reload:async()=>{},onBusyChange(){}}));
  assert.ok(html.includes(`Maximum ${size/1048576} MB per file.`));assert.ok(!html.includes('Maximum 5 MB'));
 }
});
