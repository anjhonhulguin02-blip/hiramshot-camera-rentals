import test from 'node:test';
import assert from 'node:assert/strict';
import {encode} from 'next-auth/jwt';
import {canReview,reviewDecision,reviewOwner,publicReviewPath} from '../lib/review-access';
import {withRequestSecurity,requestSecurity} from '../lib/request-security';
const secret='SYNTHETIC-TEST-SECRET-NEVER-USED-IN-PRODUCTION';
test('private review accepts only an authenticated allowlisted Google principal',async()=>{
 for(const secure of [false,true]){
  const name=(secure?'__Secure-':'')+'authjs.session-token',token=await encode({token:{principal:'google:123',email:'owner@example.invalid'},secret,salt:name,maxAge:300});
  const url=(secure?'https':'http')+'://example.invalid/account',request=new Request(url,{headers:{Cookie:name+'='+token}});
  assert.equal(await canReview(request,secret,'owner@example.invalid'),true);
  assert.equal(await canReview(request,secret,'other@example.invalid'),false);
  assert.equal(await reviewDecision(request,secret,'other@example.invalid'),'review-only','a signed-in client gets a stable review screen instead of another sign-in');
  assert.equal(await canReview(request,secret+'wrong','owner@example.invalid'),false);
 }
 const forged=new Request('https://example.invalid',{headers:{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@example.invalid'}});
 assert.equal(await canReview(forged,secret,'owner@example.invalid'),false);
 assert.equal(reviewOwner({principal:'sites:123',email:'owner@example.invalid'},'owner@example.invalid'),false);
});
test('review exposes only login handlers and static assets before authentication',()=>{
 for(const path of ['/login','/logout','/review-access','/api/auth/callback/google','/assets/logo.png','/_next/static/a.js'])assert.equal(publicReviewPath(path),true);
 for(const path of ['/','/account','/admin','/api/account','/api/documents/x','/api/authentication','/login-as-owner'])assert.equal(publicReviewPath(path),false);
});
test('trusted ingress context stays isolated across concurrent requests',async()=>{
 const values=await Promise.all(['203.0.113.1','203.0.113.2'].map(ip=>withRequestSecurity({ip},async()=>{await Promise.resolve();return requestSecurity()?.ip;})));
 assert.deepEqual(values,['203.0.113.1','203.0.113.2']);assert.equal(requestSecurity(),undefined);
});
test('private review validates password-session versions and denies revoked or unverified identities',async()=>{
 const name='__Secure-authjs.session-token',principal='email:00000000-0000-4000-8000-000000000001';
 const token=await encode({token:{principal,email:'owner@example.invalid',authMethod:'password',emailVerified:true,credentialId:'synthetic',credentialVersion:2},secret,salt:name,maxAge:300});
 const request=new Request('https://example.invalid/account',{headers:{Cookie:name+'='+token}});
 const mock=(version:number,verified:string|null)=>({prepare:()=>({bind:()=>({first:async()=>({principal,session_version:version,verified_at:verified})})})}) as unknown as D1Database;
 assert.equal(await canReview(request,secret,'owner@example.invalid',mock(2,'verified'),true),true);
 assert.equal(await canReview(request,secret,'owner@example.invalid',mock(3,'verified'),true),false);
 assert.equal(await canReview(request,secret,'owner@example.invalid',mock(2,null),true),false);
 assert.equal(await canReview(request,secret,'owner@example.invalid',mock(2,'verified'),false),false);
 assert.equal(reviewOwner({principal,email:'owner@example.invalid'},'owner@example.invalid'),false);
});
