'use client';
import {DEFAULT_CONTACT_EMAIL} from '../../lib/contact';
import { useEffect,useRef,useState } from 'react';
declare global{interface Window{turnstile?:{render:(el:HTMLElement,options:Record<string,unknown>)=>string;remove:(id:string)=>void};}}
export default function Challenge({siteKey,action,onToken,reset=0,contactEmail=DEFAULT_CONTACT_EMAIL}:{siteKey:string|null;action:string;onToken:(v:string)=>void;reset?:number;contactEmail?:string}){
 const ref=useRef<HTMLDivElement>(null),callback=useRef(onToken);callback.current=onToken;
 const [phase,setPhase]=useState<'loading'|'challenge'|'verified'|'failed'>('loading'),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(!siteKey)return;let widget:string|undefined,alive=true;setPhase('loading');
  function fail(){if(alive){callback.current('');setPhase('failed');}}
  function render(){if(!alive||!ref.current||!window.turnstile||widget)return;try{widget=window.turnstile.render(ref.current,{sitekey:siteKey,action,size:ref.current.clientWidth<300?'compact':'flexible',callback:(value:string)=>{if(alive){callback.current(value);setPhase('verified');}},'expired-callback':fail,'error-callback':fail,'timeout-callback':fail});setPhase('challenge');}catch{fail();}}
  let script=document.querySelector<HTMLScriptElement>('script[data-turnstile]');
  if(script?.dataset.failed==='true'){script.remove();script=null;}
  if(!script){script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.dataset.turnstile='true';document.head.appendChild(script);}
  const selectedScript=script;function scriptFailed(){selectedScript.dataset.failed='true';fail();}
  selectedScript.addEventListener('load',render);selectedScript.addEventListener('error',scriptFailed);render();
  const timer=setTimeout(()=>{if(!widget)fail();},20000);
  return()=>{alive=false;clearTimeout(timer);callback.current('');selectedScript.removeEventListener('load',render);selectedScript.removeEventListener('error',scriptFailed);if(widget)try{window.turnstile?.remove(widget);}catch{}};
 },[siteKey,action,reset,retry]);
 return siteKey?<div className="challenge"><div ref={ref}/><p className="price-detail" role="status" aria-live="polite">{phase==='loading'?'Loading the security check…':phase==='verified'?'Security check complete.':phase==='failed'?'The security check could not finish. Please try again.':'Complete the security check to continue.'}</p>{phase==='failed'&&<button type="button" className="text-link" onClick={()=>setRetry(value=>value+1)}>Retry security check</button>}</div>:<div className="challenge-note">Online submission is not open yet. Your rental quote is ready; contact <a href={'mailto:'+contactEmail}>{contactEmail}</a> for booking assistance.</div>;
}
