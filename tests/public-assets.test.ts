import test from 'node:test';
import assert from 'node:assert/strict';
import {publicMediaUrl,responseCacheControl} from '../lib/public-assets';

test('business media uses fresh URLs and a bounded retry without changing private document URLs',()=>{
 assert.equal(publicMediaUrl('/assets/x6.jpg'),'/assets/x6.jpg?v=20261103');
 assert.equal(publicMediaUrl('/assets/logo.png',true),'/assets/logo.png?v=20261103&retry=1');
 assert.equal(publicMediaUrl('/api/documents/private'),'/api/documents/private');
 assert.equal(publicMediaUrl('blob:synthetic-private-preview'),'blob:synthetic-private-preview');
 assert.equal(publicMediaUrl('https://example.invalid/photo.jpg'),'https://example.invalid/photo.jpg');
});

test('successful public assets may cache but client data, auth, HTML, cookies and failed assets never do',()=>{
 for(const [path,type,status] of [['/assets/logo.png','image/png',200],['/assets/x6.jpg','image/jpeg',200],['/assets/clip.mp4','video/mp4',206],['/_next/static/app.js','text/javascript',200]])assert.match(responseCacheControl(path as string,status as number,type as string),/^public,/);
 for(const [path,type,status,cookie] of [['/api/documents/anything','image/jpeg',200,false],['/api/account','application/json',200,false],['/login','text/html',200,false],['/assets/missing.jpg','image/jpeg',404,false],['/assets/not-an-image','text/html',200,false],['/assets/x5.jpg','image/jpeg',200,true],['/account','text/html',200,false]])assert.equal(responseCacheControl(path as string,status as number,type as string,cookie as boolean),'private, no-store');
});
