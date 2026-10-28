import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import sharp from 'sharp';
import jsQR from 'jsqr';
import AuthenticatorSetup from '../app/admin/authenticator-setup.tsx';
import {authenticatorQr} from '../lib/authenticator-qr.ts';

const secret='GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // RFC test key; never a real enrollment.
const uriFor=email=>`otpauth://totp/HiramShot:${encodeURIComponent(email)}?secret=${secret}&issuer=HiramShot&algorithm=SHA1&digits=6&period=30`;

test('the rendered authenticator QR independently decodes to the exact provisioned account and settings',async()=>{
 for(const email of ['synthetic+qr@example.invalid','a'.repeat(64)+'@'+'b'.repeat(63)+'.'+'c'.repeat(63)+'.example.invalid']){
  const uri=uriFor(email),html=renderToStaticMarkup(React.createElement(AuthenticatorSetup,{secret,uri}));
  const svg=html.match(/<svg\b[\s\S]*?<\/svg>/)?.[0];assert.ok(svg);
  const {data,info}=await sharp(Buffer.from(svg)).resize(520,520,{kernel:'nearest'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const decoded=jsQR(new Uint8ClampedArray(data),info.width,info.height);
  assert.equal(decoded?.data,uri,'scan must match the enrolled secret, account and TOTP settings');
  assert.ok(html.includes('Can’t scan? Use the manual setup key'));
  assert.ok(html.includes(secret));assert.ok(html.includes('role="img"'));
  assert.ok(!/<(?:img|iframe|script)\b/.test(html),'no external QR image, script or iframe');
 }
});

test('mismatched or external provisioning data cannot render a different enrollment QR',()=>{
 const uri=uriFor('synthetic@example.invalid');
 for(const invalid of ['https://example.invalid/qr?secret='+secret,uri.replace('issuer=HiramShot','issuer=Other'),uri.replace('digits=6','digits=8'),uri.replace(secret,'A'.repeat(32))])assert.throws(()=>authenticatorQr(invalid,secret));
 const html=renderToStaticMarkup(React.createElement(AuthenticatorSetup,{secret,uri:''}));
 assert.ok(!html.includes('<svg'));assert.ok(html.includes('manual setup key'));assert.ok(html.includes(secret));
});
