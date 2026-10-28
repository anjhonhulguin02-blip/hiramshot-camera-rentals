import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LoginForm,EmailRequestForm,PasswordCompletionForm} from '../app/login/forms.tsx';
const render=(component,props)=>renderToStaticMarkup(React.createElement(component,props));
test('login provides email, masked password, show control and recovery without enabling unconfigured email auth',()=>{
 const html=render(LoginForm,{ready:false,siteKey:null,destination:'/account',googleReady:true,googleAction:async()=>{}});
 assert.ok(html.includes('type="email"'));assert.ok(html.includes('type="password"'));assert.ok(html.includes('autoComplete="current-password"'));assert.ok(html.includes('aria-label="Show password"'));assert.ok(html.includes('aria-pressed="false"'));
 assert.match(html,/<label[^>]*for="password">Password<\/label>/,'password label must stay independent of the show/hide control');
 assert.ok(html.includes('href="/forgot-password"'));assert.ok(html.includes('href="/create-account"'));assert.ok(html.includes('Continue with Google'));assert.ok(html.includes('Email sign-in is being prepared.'));
 assert.match(html,/<button[^>]*disabled=""[^>]*>Sign in/);assert.ok(!html.includes('Continue with Apple'));
});
test('email registration verifies ownership before accepting a new password',()=>{
 const html=render(EmailRequestForm,{mode:'create',ready:false,siteKey:null});assert.ok(html.includes('Send verification link'));assert.ok(html.includes('privacy notice'));assert.ok(!html.includes('type="password"'));
 const forgot=render(EmailRequestForm,{mode:'reset',ready:false,siteKey:null});assert.ok(forgot.includes('Send reset link'));assert.ok(!forgot.includes('name="name"'));
});
test('password completion uses new-password autofill and explicit confirmation',()=>{
 const html=render(PasswordCompletionForm,{purpose:'reset',ready:false,siteKey:null});assert.equal((html.match(/autoComplete="new-password"/g)||[]).length,2);assert.ok(html.includes('name="confirmPassword"'));assert.ok(html.includes('aria-label="Show confirm password"'));assert.ok(html.includes('15–128 characters'));
});
