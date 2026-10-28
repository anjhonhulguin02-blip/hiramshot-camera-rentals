import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import Verification from '../app/book/verification-form.tsx';
const booking={id:'00000000-0000-4000-8000-000000000001',personal:null};
const config={turnstileSiteKey:null,kycEnabled:false,contactEmail:'business@example.invalid',uploadMaxBytes:5242880};
test('unavailable verification explains the actual service blocker next to the disabled save action',()=>{const html=renderToStaticMarkup(React.createElement(Verification,{booking,docs:[],config,profile:{},reload:async()=>{}}));assert.ok(html.includes('This is a website setup issue, not an error in your entries.'));assert.ok(html.includes('Verification temporarily unavailable'));assert.ok(html.includes('mailto:business@example.invalid'));assert.ok(html.includes('0 of 9 required details complete'));assert.ok(html.includes('noValidate=""'));assert.ok(html.includes('aria-describedby="verification-mobile-hint"'));assert.match(html,/<button[^>]*disabled=""[^>]*>Verification temporarily unavailable/);});
test('document progress identifies all five slots and the next missing requirement',()=>{const html=renderToStaticMarkup(React.createElement(Verification,{booking:{...booking,personal:{fullName:'Synthetic Renter'}},docs:[{kind:'government-id-1',deleted_at:null,scan_status:'CLEAN'}],config,profile:{},reload:async()=>{}}));assert.ok(html.includes('1 of 5 documents uploaded and scanned'));assert.ok(html.includes('Valid government ID 2'));assert.ok(html.includes('Still needed'));assert.ok(html.includes('Document uploads are paused'));});
