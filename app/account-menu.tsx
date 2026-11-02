'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronDown,UserRound} from 'lucide-react';
type Session={signedIn:boolean;name?:string;email?:string;admin?:boolean};
export default function AccountMenu(){
 const [session,setSession]=useState<Session|null>(null),[failed,setFailed]=useState(false),root=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{
  const controller=new AbortController();let alive=true;
  const load=()=>{void fetch('/api/session-summary',{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])}).then(async r=>{if(!r.ok)throw new Error();const data=await r.json() as Session;if(alive){setSession(data);setFailed(false);}}).catch(()=>{if(alive)setFailed(true);});};
  load();window.addEventListener('focus',load);
  const outside=(event:PointerEvent)=>{if(root.current&&!root.current.contains(event.target as Node))root.current.open=false;};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&root.current?.open){root.current.open=false;root.current.querySelector('summary')?.focus();}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{alive=false;controller.abort();window.removeEventListener('focus',load);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[]);
 if(!session)return <a className="nav-account-loading" href="/account"><UserRound size={17} aria-hidden="true"/>{failed?'Open account':'Checking account…'}</a>;
 if(!session.signedIn)return <a className="nav-login" href="/login?return_to=%2Faccount"><UserRound size={17} aria-hidden="true"/>Log in</a>;
 return <details className="nav-account" ref={root}><summary aria-label={`Signed in as ${session.name}, ${session.email}`}><span className="nav-avatar" aria-hidden="true">{session.name?.trim().slice(0,1).toUpperCase()}</span><span className="nav-identity"><strong>{session.name?.split(' ')[0]}</strong><small title={session.email}>{session.email}</small></span><ChevronDown size={14} aria-hidden="true"/></summary><div className="nav-account-panel"><p className="eyebrow">YOUR ACCOUNT</p><strong>{session.name}</strong><span className="nav-account-email">{session.email}</span><a href="/account">Client portal</a>{session.admin&&<a href="/admin">Owner dashboard</a>}<a href="/logout?return_to=%2F" target="_top">Log out</a></div></details>;
}
