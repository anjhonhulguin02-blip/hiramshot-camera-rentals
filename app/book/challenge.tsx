'use client';
import {DEFAULT_CONTACT_EMAIL} from '../../lib/contact';
import { useEffect,useRef } from 'react';
declare global{interface Window{turnstile?:{render:(el:HTMLElement,options:Record<string,unknown>)=>string;remove:(id:string)=>void};}}
export default function Challenge({siteKey,action,onToken,reset=0,contactEmail=DEFAULT_CONTACT_EMAIL}:{siteKey:string|null;action:string;onToken:(v:string)=>void;reset?:number;contactEmail?:string}){
 const ref=useRef<HTMLDivElement>(null),callback=useRef(onToken);callback.current=onToken;
 useEffect(()=>{if(!siteKey)return;let widget:string|undefined,alive=true;function render(){if(alive&&ref.current&&window.turnstile&&!widget)widget=window.turnstile.render(ref.current,{sitekey:siteKey,action,callback:(v:string)=>callback.current(v),'expired-callback':()=>callback.current(''),'error-callback':()=>callback.current('')});}let script=document.querySelector<HTMLScriptElement>('script[data-turnstile]');if(!script){script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.dataset.turnstile='true';document.head.appendChild(script);}script.addEventListener('load',render);render();return()=>{alive=false;callback.current('');script?.removeEventListener('load',render);if(widget)window.turnstile?.remove(widget);};},[siteKey,action,reset]);
 return siteKey?<div ref={ref} className="challenge"/>:<div className="challenge-note">Online submission is awaiting security setup. You can calculate rates now. For booking assistance, email <a href={'mailto:'+contactEmail}>{contactEmail}</a>.</div>;
}
