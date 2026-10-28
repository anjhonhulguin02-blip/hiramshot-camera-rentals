import {FILE_UPLOAD_LIMIT} from '../../../../../lib/request-limits';
import { env,uploadMaxBytes } from '@hiramshot/runtime';
import { ApiError,database,failure,identity,json } from '../../../../../lib/api';
import { DOCUMENT_KINDS,getBooking } from '../../../../../lib/booking';
import { applyRequestLimit,audit,kycReady,verifyTurnstile } from '../../../../../lib/security';
import { boundedBytes,sanitizeUpload } from '../../../../../lib/upload';
import {scanPrivateFile,ScanFailure} from '../../../../../lib/malware-scanner';
export async function POST(request:Request,ctx:{params:Promise<{id:string}>}){try{
  if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')throw new ApiError(403,'Submit documents from this website.');
  const u=await identity(),{id}=await ctx.params,row=await getBooking(id,u.userId);if(!['requested','verification','reserved'].includes(row.status)||(row.status==='reserved'&&row.verified_at)||!row.personal)throw new ApiError(409,'Save your required verification details before uploading.');if(!kycReady())throw new ApiError(503,'Private verification is not enabled.');await applyRequestLimit(request,u.userId,FILE_UPLOAD_LIMIT);
  let raw;try{raw=await boundedBytes(request,uploadMaxBytes+32768);}catch(e){throw new ApiError(413,(e as Error).message);}const body=await new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('content-type')??''},body:raw as BodyInit}).formData();
  const kind=body.get('kind'),file=body.get('file');if(!DOCUMENT_KINDS.includes(kind as typeof DOCUMENT_KINDS[number])||!(file instanceof File))throw new ApiError(400,'Choose a valid document type and file.');await verifyTurnstile(request,body.get('turnstileToken'),'upload');
  let sanitized;try{sanitized=sanitizeUpload(file.name,file.type,new Uint8Array(await file.arrayBuffer()));}catch(e){throw new ApiError(400,(e as Error).message);}
  let hash:string;try{hash=await scanPrivateFile(sanitized.bytes,env);}catch(error){if(error instanceof ScanFailure)throw new ApiError(error.status,error.message);throw error;}
  const duplicate=await database().prepare('SELECT id FROM kyc_documents WHERE booking_id=? AND sha256=? AND deleted_at IS NULL').bind(id,hash).first();if(duplicate)throw new ApiError(409,'Use a different document for each required type. This exact file is already submitted.');
  const docId=crypto.randomUUID(),key=`kyc/${crypto.randomUUID()}`,now=new Date().toISOString();await audit(request,u.userId,id,`kyc.upload:${kind}`);
  await env.BUCKET!.put(key,sanitized.bytes,{httpMetadata:{contentType:sanitized.mime},customMetadata:{purpose:'identity-verification'}});
  try{const saved=await database().prepare('INSERT INTO kyc_documents(id,booking_id,kind,object_key,mime,size,created_at,sha256,scan_status) SELECT ?,?,?,?,?,?,?,?,\'CLEAN\' WHERE EXISTS(SELECT 1 FROM bookings WHERE id=? AND status IN (\'requested\',\'reserved\',\'verification\') AND verified_at IS NULL) ON CONFLICT(booking_id,kind) DO UPDATE SET id=excluded.id,object_key=excluded.object_key,mime=excluded.mime,size=excluded.size,created_at=excluded.created_at,deleted_at=NULL,sha256=excluded.sha256,scan_status=excluded.scan_status,reviewed_at=NULL,reviewed_by=NULL WHERE kyc_documents.deleted_at IS NOT NULL').bind(docId,id,kind,key,sanitized.mime,sanitized.bytes.length,now,hash,id).run();if(!saved.meta.changes)throw new Error('Booking changed.');}catch{await env.BUCKET!.delete(key);throw new ApiError(409,'This document type is already submitted or the booking changed. Ask HiramShot to replace it.');}
  return json({id:docId,kind},201);
}catch(e){return failure(e);}}
