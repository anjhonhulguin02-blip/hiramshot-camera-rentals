import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewInput,reviewByteRange,reviewMediaReady} from '../lib/review-policy';
test('reviews require a real rating, bounded text and explicit publication consent',()=>{
 const valid={rating:4,text:'Synthetic rental review for testing.',displayName:'Test renter',publicConsent:true};assert.equal(reviewInput(valid).rating,4);
 for(const changed of [{rating:0},{rating:6},{rating:4.5},{rating:'5'},{text:'tiny'},{text:'x'.repeat(2001)},{displayName:'private@example.invalid'},{publicConsent:'true'},{publicConsent:false}])assert.throws(()=>reviewInput({...valid,...changed}));
});
test('review media processing stays off until the private pipeline is explicitly enabled',()=>{
 assert.equal(reviewMediaReady({BUCKET:{}}),false);assert.equal(reviewMediaReady({REVIEW_MEDIA_ENABLED:'true',BUCKET:{},REVIEW_MEDIA_PROCESSOR_URL:'http://invalid.local',REVIEW_MEDIA_PROCESSOR_TOKEN:'SYNTHETIC'}),false);
 const ready={REVIEW_MEDIA_ENABLED:'true',BUCKET:{},REVIEW_MEDIA_PROCESSOR_URL:'https://private.example.invalid',REVIEW_MEDIA_PROCESSOR_TOKEN:'SYNTHETIC-TEST-TOKEN-NEVER-USED-IN-PRODUCTION',TURNSTILE_SITE_KEY:'SYNTHETIC',TURNSTILE_SECRET_KEY:'SYNTHETIC'};assert.equal(reviewMediaReady(ready),true);assert.equal(reviewMediaReady({...ready,TURNSTILE_SECRET_KEY:undefined}),false);
});
test('video ranges accept browser seeks and reject multiple, malformed or out-of-bounds ranges',()=>{
 assert.equal(reviewByteRange(null,100),null);assert.deepEqual(reviewByteRange('bytes=0-9',100),{offset:0,length:10});assert.deepEqual(reviewByteRange('bytes=90-',100),{offset:90,length:10});assert.deepEqual(reviewByteRange('bytes=-20',100),{offset:80,length:20});assert.deepEqual(reviewByteRange('bytes=90-999',100),{offset:90,length:10});
 for(const range of ['bytes=100-','bytes=5-1','bytes=-0','bytes=0-1,3-4','bytes=-','not-a-range'])assert.throws(()=>reviewByteRange(range,100));
});
