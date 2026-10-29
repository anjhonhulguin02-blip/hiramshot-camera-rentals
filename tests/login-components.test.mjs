import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LoginForm,EmailRequestForm,PasswordCompletionForm} from '../app/login/forms.tsx';
const render=(component,props)=>renderToStaticMarkup(React.createElement(component,props));
test('login provides email, masked password, show control and recovery without enabling unconfigured email auth',()=>{
 const html=render(LoginForm,{ready:true,siteKey:null,destination:'/account',googleReady:true,googleAction:async()=>{}});
 assert.ok(html.includes('type="email"'));assert.ok(html.includes('type="password"'));assert.ok(html.includes('autoComplete="current-password"'));assert.ok(html.includes('aria-label="Show password"'));assert.ok(html.includes('aria-pressed="false"'));
 assert.match(html,/<label[^>]*for="password">Password<\/label>/,'password label must stay independent of the show/hide control');
 assert.ok(html.includes('href="/forgot-password"'));assert.ok(html.includes('href="/create-account"'));assert.ok(html.includes('Continue with Google'));
 assert.match(html,/<button[^>]*disabled=""[^>]*>Sign in/);assert.ok(!html.includes('Continue with Apple'));
});
test('email registration verifies ownership before accepting a new password',()=>{
 const html=render(EmailRequestForm,{mode:'create',ready:true,siteKey:null});assert.ok(html.includes('Send verification link'));assert.ok(html.includes('privacy notice'));assert.ok(!html.includes('type="password"'));
 const forgot=render(EmailRequestForm,{mode:'reset',ready:true,siteKey:null});assert.ok(forgot.includes('Send reset link'));assert.ok(!forgot.includes('name="name"'));
});
test('password completion uses new-password autofill and explicit confirmation',()=>{
 const html=render(PasswordCompletionForm,{purpose:'reset',ready:true,siteKey:null});assert.equal((html.match(/autoComplete="new-password"/g)||[]).length,2);assert.ok(html.includes('name="confirmPassword"'));assert.ok(html.includes('aria-label="Show confirm password"'));assert.ok(html.includes('15–128 characters'));
});

test('Google-only access shows only the active sign-in path across login, registration and recovery',()=>{const forms=[render(LoginForm,{ready:false,siteKey:null,destination:'/account',googleReady:true,googleAction:async()=>{}}),...['create','reset'].map(mode=>render(EmailRequestForm,{mode,ready:false,siteKey:null,googleReady:true,googleAction:async()=>{}})),...['verify','reset'].map(purpose=>render(PasswordCompletionForm,{purpose,ready:false,siteKey:null}))];for(const html of forms){assert.ok(html.includes('Continue with Google'));assert.ok(html.includes('No separate HiramShot password is needed'));assert.ok(!html.includes('temporarily unavailable'));assert.ok(!html.includes('being prepared'));assert.ok(!html.includes('type="password"'));assert.ok(!html.includes('type="email"'));assert.ok(!html.includes('Send reset link'));}});
