'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {UploadCloud} from 'lucide-react';
import {DOCUMENT_KINDS,DOCUMENT_LABELS} from '../../lib/verification';
import {governmentKind,idOptions} from '../../lib/id-document';
import {nextDocumentKind} from '../../lib/document-flow';
import {MAX_UPLOAD_BYTES,uploadLimitLabel} from '../../lib/upload-limits';
import {submissionResponse} from '../../lib/submission-response';
import type {VerificationDocument} from './document-viewer';

export default function AdminRequirementUpload({scope,id,documents,disabled=false,onUploaded}:{scope:'booking'|'account';id:string;documents:VerificationDocument[];disabled?:boolean;onUploaded:()=>Promise<void>}){
 const [kind,setKind]=useState<string>(()=>nextDocumentKind(documents)||DOCUMENT_KINDS[0]),[idType,setIdType]=useState(''),[file,setFile]=useState<File|null>(null),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[refreshNeeded,setRefreshNeeded]=useState(false);
 const request=useRef<AbortController|null>(null);useEffect(()=>()=>request.current?.abort(),[]);
 const fileInput=useRef<HTMLInputElement>(null),alert=useRef<HTMLParagraphElement>(null);
 const current=documents.find(doc=>doc.kind===kind&&!doc.deleted_at),locked=!!current?.reviewed_at,options=idOptions(kind),other=documents.find(doc=>governmentKind(doc.kind)&&doc.kind!==kind&&!doc.deleted_at),blocked=busy||disabled||refreshNeeded;
 function selectKind(value:string){setKind(value);setIdType('');setFile(null);setError('');setNotice('');if(fileInput.current)fileInput.current.value='';}
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(blocked||locked||!file)return;
  setError('');setNotice('');if(file.size>MAX_UPLOAD_BYTES){setError('Choose a file no larger than '+uploadLimitLabel()+'.');return;}
  setBusy(true);let received=false;const controller=new AbortController();request.current=controller;
  try{
   const body=new FormData();body.set('kind',kind);body.set('idType',idType);body.set('captureSource','file');body.set('file',file);body.set('clientConsentConfirmed',String(consent));
   const path=scope==='booking'?`/api/admin/bookings/${id}/documents`:`/api/admin/verifications/${id}/documents`;
   const response=await fetch(path,{method:'POST',body,signal:AbortSignal.any([controller.signal,AbortSignal.timeout(90000)])});
   if(response.status>=500)setRefreshNeeded(true);
   const data=await submissionResponse(response,'The result could not be confirmed. Refresh the requirements before sending this file again.');
   if(response.status!==201||!data.id||data.status!=='RECEIVED_FOR_MANUAL_REVIEW'){setRefreshNeeded(true);throw new Error('The upload receipt could not be confirmed. Refresh the requirements before retrying.');}
   if(controller.signal.aborted)return;received=true;setFile(null);if(fileInput.current)fileInput.current.value='';
   await onUploaded();const next=nextDocumentKind(documents,kind);if(next)selectKind(next);
   setNotice(`${DOCUMENT_LABELS[kind as typeof DOCUMENT_KINDS[number]]} added privately. Review and approval are still separate.`);
  }catch(error){if(received){setRefreshNeeded(true);setNotice('File received. Refresh the checklist to see it; do not send the same file again.');}else{if(error instanceof Error&&['TimeoutError','AbortError','TypeError'].includes(error.name))setRefreshNeeded(true);setError((error as Error).message);}}
  finally{setBusy(false);requestAnimationFrame(()=>alert.current?.focus());}
 }
 return <details className="admin-requirement-upload"><summary><UploadCloud size={19} aria-hidden="true"/>Add requirements received through Messenger</summary><p>Upload a client-supplied file on their behalf. Files stay private and pass the same antivirus, size and document checks as client uploads.</p><form onSubmit={submit}>
  <div className="booking-fields"><label>Requirement<select value={kind} disabled={blocked} onChange={event=>selectKind(event.target.value)}>{DOCUMENT_KINDS.map(slot=><option key={slot} value={slot}>{DOCUMENT_LABELS[slot]}</option>)}</select></label>{options.length>0&&<label>ID type<select required value={idType} disabled={blocked||locked} onChange={event=>setIdType(event.target.value)}><option value="">Choose ID type</option>{options.map(option=><option key={option.id} value={option.id} disabled={governmentKind(kind)&&other?.id_type===option.id}>{option.label}</option>)}</select></label>}</div>
  {locked?<p className="info-note">This file is already reviewed. Use “Remove for replacement” before uploading a new copy.</p>:<><label>Client’s file<input ref={fileInput} type="file" required disabled={blocked} accept={kind==='proof-of-billing'?'.jpg,.jpeg,.png,.webp,.pdf':'.jpg,.jpeg,.png,.webp'} onChange={event=>{setFile(event.target.files?.[0]??null);setError('');}}/></label><p className="field-hint">Maximum {uploadLimitLabel()} per file. Use a readable original photo; plain PDF is accepted for billing proof.</p><label className="consent"><input type="checkbox" required checked={consent} disabled={blocked} onChange={event=>setConsent(event.target.checked)}/><span>The client provided this file and authorized HiramShot to use it privately for this rental’s identity verification.</span></label><button className="button" disabled={blocked||!file||!consent||!!options.length&&!idType}><UploadCloud size={17} aria-hidden="true"/>{busy?'Scanning and saving…':'Add client requirement'}</button></>}
  {(error||notice)&&<p ref={alert} tabIndex={-1} role={error?'alert':'status'} className={error?'verification-errors':'verification-success'}>{error||notice}</p>}
  {refreshNeeded&&<button type="button" className="button secondary" disabled={busy} onClick={async()=>{setBusy(true);try{await onUploaded();setRefreshNeeded(false);setError('');setNotice('Requirements refreshed. Check the received files before uploading again.');}catch{setError('Could not refresh. Keep this page open and retry when the connection is stable.');}finally{setBusy(false);}}}>Refresh requirements</button>}
 </form></details>;
}
