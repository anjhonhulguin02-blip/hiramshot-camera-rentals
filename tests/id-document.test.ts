import test from 'node:test';
import assert from 'node:assert/strict';
import {captureMetadata,validateGovernmentIdPair,imageDimensions,validateIdentityPhoto} from '../lib/id-document';
import {captureCrop,cameraErrorMessage} from '../lib/camera-capture';
import {permissionsPolicy} from '../lib/http-security';

test('client-claimed ID types and sources cannot substitute for supported server metadata',()=>{
 assert.deepEqual(captureMetadata('government-id-1','philhealth-id','camera'),{idType:'philhealth-id',captureSource:'camera'});
 assert.deepEqual(captureMetadata('proof-of-billing','','file'),{idType:null,captureSource:'file'});
 for(const [kind,type,source]of [['government-id-1','','camera'],['company-school-id','passport','file'],['government-id-2','invented','file'],['selfie-with-id','passport','camera'],['government-id-1','passport','trusted']])assert.throws(()=>captureMetadata(kind,type,source));
 assert.throws(()=>validateGovernmentIdPair([]));assert.throws(()=>validateGovernmentIdPair([{kind:'government-id-1',id_type:'passport'},{kind:'government-id-2',id_type:'passport'}]));
 assert.throws(()=>validateGovernmentIdPair([{kind:'government-id-1',id_type:'passport',deleted_at:'test'},{kind:'government-id-2',id_type:'national-id'}]));
 assert.doesNotThrow(()=>validateGovernmentIdPair([{kind:'government-id-1',id_type:'passport'},{kind:'government-id-2',id_type:'national-id'}]));
});
test('photo dimensions cover PNG, JPEG and WebP without accepting tiny or excessive identity photos',()=>{
 const png=new Uint8Array(24),view=new DataView(png.buffer);view.setUint32(16,800);view.setUint32(20,500);
 const jpeg=new Uint8Array([255,216,255,192,0,17,8,1,244,3,32,3,1,17,0,2,17,0,3,17,0]);
 const webp=new Uint8Array(30);webp.set(new TextEncoder().encode('VP8X'),12);const wv=new DataView(webp.buffer);wv.setUint32(16,10,true);webp[24]=31;webp[25]=3;webp[27]=243;webp[28]=1;
 for(const [bytes,mime]of [[png,'image/png'],[jpeg,'image/jpeg'],[webp,'image/webp']] as const){assert.deepEqual(imageDimensions(bytes,mime),{width:800,height:500});assert.doesNotThrow(()=>validateIdentityPhoto('government-id-1',bytes,mime));}
 view.setUint32(16,1);assert.throws(()=>validateIdentityPhoto('government-id-1',png,'image/png'),/too small/);view.setUint32(16,12001);assert.throws(()=>validateIdentityPhoto('government-id-1',png,'image/png'),/too large/);
 assert.throws(()=>validateIdentityPhoto('government-id-1',new Uint8Array(),'application/pdf'),/PDFs are accepted for billing/);assert.doesNotThrow(()=>validateIdentityPhoto('proof-of-billing',new Uint8Array(),'application/pdf'));
 assert.equal(imageDimensions(new Uint8Array([255,216,255,192,255,255]),'image/jpeg'),null);
 assert.equal(imageDimensions(new Uint8Array([255,216,255,255,255,255,255,255]),'image/jpeg'),null);
 assert.equal(imageDimensions(webp.slice(0,27),'image/webp'),null);
});
test('camera guide crops the actual object-cover preview and rejects invalid camera geometry',()=>{
 assert.deepEqual(captureCrop(1920,1080,400,400,320,200),{x:528,y:270,width:864,height:540});
 assert.deepEqual(captureCrop(640,480,640,480,1000,1000),{x:0,y:0,width:640,height:480});
 for(const value of [0,-1,Infinity,NaN])assert.throws(()=>captureCrop(value,480,640,480,320,200));
 assert.match(cameraErrorMessage({name:'NotAllowedError'}),/Enable it/);assert.match(cameraErrorMessage({name:'NotFoundError'}),/No camera/);assert.match(cameraErrorMessage({name:'NotReadableError'}),/Another app/);
});
test('camera access is allowed only on the two capture pages while microphone stays blocked',()=>{
 for(const path of ['/book','/account'])assert.equal(permissionsPolicy(path),'camera=(self), microphone=(), geolocation=(), payment=()');
 for(const path of ['/','/admin','/login','/account/other','/api/account'])assert.equal(permissionsPolicy(path),'camera=(), microphone=(), geolocation=(), payment=()');
});
