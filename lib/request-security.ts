import {AsyncLocalStorage} from 'node:async_hooks';
const state=new AsyncLocalStorage<{ip:string}>();
export function withRequestSecurity<T>(context:{ip:string},run:()=>T){return state.run(context,run);}
export function requestSecurity(){return state.getStore();}
