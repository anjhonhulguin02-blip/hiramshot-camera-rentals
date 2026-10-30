'use client';
import {useEffect,useRef,useState} from 'react';
import {Camera,RotateCcw,X,Check,Smartphone} from 'lucide-react';
import {captureCrop,cameraErrorMessage} from '../../lib/camera-capture';
import {validateIdentityPhoto} from '../../lib/id-document';
export default function IdCamera({kind,idType,disabled,onPhoto}:{kind:string;idType:string;disabled:boolean;onPhoto:(file:File)=>void}){
 const selfie=kind==='selfie-with-id',label=selfie?'selfie with your ID':'ID photo';
 const dialog=useRef<HTMLDialogElement>(null),video=useRef<HTMLVideoElement>(null),guide=useRef<HTMLDivElement>(null),native=useRef<HTMLInputElement>(null),stream=useRef<MediaStream|null>(null),generation=useRef(0),photoUrl=useRef('');
 const [busy,setBusy]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[photo,setPhoto]=useState<File|null>(null),[preview,setPreview]=useState('');
 function stop(){stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;if(video.current)video.current.srcObject=null;setReady(false);}
 function clearPhoto(){if(photoUrl.current)URL.revokeObjectURL(photoUrl.current);photoUrl.current='';setPhoto(null);setPreview('');}
 function close(){generation.current++;stop();clearPhoto();setBusy(false);dialog.current?.close();}
 useEffect(()=>{const hidden=()=>{if(document.hidden)close();};document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',close);return()=>{generation.current++;stream.current?.getTracks().forEach(track=>track.stop());if(photoUrl.current)URL.revokeObjectURL(photoUrl.current);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',close);};},[]);
 async function start(){
  clearPhoto();setError('');setReady(false);setBusy(true);const current=++generation.current;if(!dialog.current?.open)dialog.current?.showModal();
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw new Error('Live camera is unavailable in this browser. Use the phone camera option below.');
   const media=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:selfie?'user':'environment'},width:{ideal:1920},height:{ideal:1440}}});
   if(current!==generation.current){media.getTracks().forEach(track=>track.stop());return;}
   stream.current=media;if(!video.current)throw new Error('Close the camera and try again.');video.current.srcObject=media;await video.current.play();
  }catch(error){if(current===generation.current){stop();setError(cameraErrorMessage(error));}}finally{if(current===generation.current)setBusy(false);}
 }
 async function capture(){
  if(!video.current?.videoWidth||!guide.current||busy)return;setError('');setBusy(true);const current=++generation.current;
  try{
   const source=video.current,view=source.getBoundingClientRect(),frame=guide.current.getBoundingClientRect(),crop=selfie?{x:0,y:0,width:source.videoWidth,height:source.videoHeight}:captureCrop(source.videoWidth,source.videoHeight,view.width,view.height,frame.width*1.04,frame.height*1.04);
   const scale=Math.min(1,2000/Math.max(crop.width,crop.height)),canvas=document.createElement('canvas');canvas.width=Math.round(crop.width*scale);canvas.height=Math.round(crop.height*scale);const context=canvas.getContext('2d');if(!context)throw new Error('Photo capture is unavailable. Use the phone camera below.');context.drawImage(source,crop.x,crop.y,crop.width,crop.height,0,0,canvas.width,canvas.height);
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Could not create the photo. Try again.')),'image/jpeg',0.9));
   const file=new File([blob],'identity-photo.jpg',{type:'image/jpeg'});validateIdentityPhoto(kind,new Uint8Array(await file.arrayBuffer()),file.type);if(current!==generation.current)return;clearPhoto();setPhoto(file);photoUrl.current=URL.createObjectURL(file);setPreview(photoUrl.current);stop();
  }catch(error){if(current===generation.current)setError(cameraErrorMessage(error));}finally{if(current===generation.current)setBusy(false);}
 }
 async function nativePhoto(file:File|null){
  if(!file)return;setBusy(true);setError('');let url='';const current=++generation.current;
  try{
   if(file.size>20*1024*1024)throw new Error('This camera photo is too large. Use a lower camera resolution.');
   url=URL.createObjectURL(file);const image=new Image();image.src=url;await image.decode();if(current!==generation.current)return;if(!image.naturalWidth||image.naturalWidth*image.naturalHeight>48000000)throw new Error('Use a standard-resolution camera photo, up to 48 megapixels.');const scale=Math.min(1,2000/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);const context=canvas.getContext('2d');if(!context)throw new Error('Cannot prepare this photo. Save it as JPG or PNG first.');context.drawImage(image,0,0,canvas.width,canvas.height);
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Save the photo as JPG or PNG and try again.')),'image/jpeg',0.9));const result=new File([blob],'identity-photo.jpg',{type:'image/jpeg'});validateIdentityPhoto(kind,new Uint8Array(await result.arrayBuffer()),result.type);if(current!==generation.current)return;onPhoto(result);close();
  }catch(error){if(current===generation.current)setError(cameraErrorMessage(error));}finally{if(url)URL.revokeObjectURL(url);if(native.current)native.current.value='';if(current===generation.current)setBusy(false);}
 }
 const nativeControl=<><button type="button" className="button secondary" disabled={disabled||busy} onClick={()=>native.current?.click()}><Smartphone size={17} aria-hidden="true"/>Use phone camera</button><input ref={native} className="visually-hidden" aria-label="Take photo with phone camera" type="file" accept="image/*" capture={selfie?'user':'environment'} onChange={event=>void nativePhoto(event.target.files?.[0]??null)}/></>;
 return <div className="id-camera-control"><button type="button" className="button" disabled={disabled||busy} onClick={start}><Camera size={18} aria-hidden="true"/>{selfie?'Take selfie with ID':'Scan ID with camera'}</button><p className="field-hint">Use good light, avoid glare and include every corner. Camera capture does not automatically authenticate an ID.</p>{error&&!dialog.current?.open&&<p className="field-error" role="alert">{error}</p>}<dialog ref={dialog} className="id-camera-dialog" aria-labelledby="id-camera-title" onCancel={close} onClose={()=>{generation.current++;stop();clearPhoto();}}><div className="dialog-heading"><div><p className="eyebrow">PRIVATE CAMERA CAPTURE</p><h2 id="id-camera-title">Capture your {label}.</h2></div><button type="button" className="icon-button" aria-label="Close camera" onClick={close}><X size={22} aria-hidden="true"/></button></div><p>{selfie?'Hold your physical ID beside your face. Both must be clear.':'Place the original ID inside the frame. Keep the text and all corners visible.'}</p><div className={'id-camera-stage'+(selfie?' selfie':'')}>{photo&&preview?<img src={preview} alt="Your captured photo, stored on this device until submission"/>:<><video ref={video} autoPlay muted playsInline onLoadedData={()=>setReady(true)}/><div ref={guide} className={'id-camera-guide'+(idType==='passport'?' passport':'')} aria-hidden="true"/><span className="id-camera-caption">{busy?'Starting camera…':ready?'Align the original document in the frame':'Camera preview'}</span></>}</div>{error&&<p className="field-error" role="alert">{error}</p>}<div className="id-camera-actions">{photo?<><button type="button" className="button secondary" onClick={start} disabled={busy}><RotateCcw size={16} aria-hidden="true"/>Retake</button><button type="button" className="button" onClick={()=>{if(photo)onPhoto(photo);close();}}><Check size={16} aria-hidden="true"/>Use this photo</button></>:<><button type="button" className="button" onClick={capture} disabled={!ready||busy}><Camera size={17} aria-hidden="true"/>Take photo</button>{nativeControl}</>}</div><p className="field-hint">No audio or video is recorded. The photo stays on this device until you submit it for HiramShot review.</p></dialog></div>;
}
