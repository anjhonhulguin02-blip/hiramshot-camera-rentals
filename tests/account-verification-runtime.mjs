import {registerHooks} from 'node:module';
globalThis.hiramshotTestEnv={};
globalThis.hiramshotTestUser=null;
registerHooks({
 resolve(specifier,context,next){
  if(specifier==='@hiramshot/runtime')return {url:'hiramshot-test:runtime',shortCircuit:true};
  let result;try{result=next(specifier,context);}catch(error){if(specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))result=next(specifier+'.ts',context);else throw error;}
  if(result.url.endsWith('/app/chatgpt-auth.ts'))return {url:'hiramshot-test:identity',shortCircuit:true};return result;
 },
 load(url,context,next){
  if(url==='hiramshot-test:runtime')return {format:'module',shortCircuit:true,source:'export const env=globalThis.hiramshotTestEnv; export const platform="cloudflare"; export const isDevelopment=false; export const uploadMaxBytes=5242880;'};
  if(url==='hiramshot-test:identity')return {format:'module',shortCircuit:true,source:'export async function getChatGPTUser(){return globalThis.hiramshotTestUser;}'};
  return next(url,context);
 }
});
