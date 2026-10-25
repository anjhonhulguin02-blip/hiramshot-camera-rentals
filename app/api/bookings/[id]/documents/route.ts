import { env } from 'cloudflare:workers';
import { ApiError,database,failure,identity,json } from '../../../../../lib/api';
import { DOCUMENT_KINDS,getBooking } from '../../../../../lib/booking';
import { abuseLimit,audit,kycReady,verifyTurnstile } from '../../../../../lib/security';
import { boundedBytes,MAX_FILE,sanitizeUpload } from '../../../../../lib/upload';
export async function POST(request:Request,ctx:{params:Promise<{id:string}>}){try{
  if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')throw new ApiError(403,'Submit documents from this website.');
  const u=await identity(),{id}=await ctx.params,row=await getBooking(id,u.userId);if(!['reserved','verification'].includes(row.status)||!row.personal)throw new ApiError(409,'Save your verification details after reservation before uploading.');if(!kycReady())throw new ApiError(503,'Private verification is not enabled.');await abuseLimit(request,u.userId,'upload');
  let raw;try{raw=await boundedBytes(request,MAX_FILE+32768);}catch(e){throw new ApiError(413,(e as Error).message);}const body=await new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('content-type')??''},body:raw as BodyInit}).formData();
  const kind=body.get('kind'),file=body.get('file');if(!DOCUMENT_KINDS.includes(kind as typeof DOCUMENT_KINDS[number])||!(file instanceof File))throw new ApiError(400,'Choose a valid document type and file.');await verifyTurnstile(request,body.get('turnstileToken'),'upload');
  let sanitized;try{sanitized=sanitizeUpload(file.name,file.type,new Uint8Array(await file.arrayBuffer()));}catch(e){throw new ApiError(400,(e as Error).message);}
  const scanner=new URL(env.MALWARE_SCANNER_URL!);if(scanner.protocol!=='https:')throw new ApiError(503,'A secure document scanner is required.');const result=await fetch(scanner,{method:'POST',headers:{'Content-Type':'application/octet-stream','Authorization':`Bearer ${env.MALWARE_SCANNER_TOKEN}`},body:sanitized.bytes as BodyInit,signal:AbortSignal.timeout(20000)});const scan=await result.json() as {clean?:boolean};if(!result.ok||scan.clean!==true)throw new ApiError(400,'The document did not pass the security scan. Choose a different file.');
  const docId=crypto.randomUUID(),key=`kyc/${crypto.randomUUID()}`,now=new Date().toISOString();await audit(request,u.userId,id,`kyc.upload:${kind}`);
  await env.BUCKET!.put(key,sanitized.bytes,{httpMetadata:{contentType:sanitized.mime},customMetadata:{purpose:'identity-verification'}});
  try{const saved=await database().prepare('INSERT INTO kyc_documents(id,booking_id,kind,object_key,mime,size,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM bookings WHERE id=? AND status IN (\'reserved\',\'verification\'))').bind(docId,id,kind,key,sanitized.mime,sanitized.bytes.length,now,id).run();if(!saved.meta.changes)throw new Error('Booking changed.');}catch{await env.BUCKET!.delete(key);throw new ApiError(409,'This document type is already submitted or the booking changed. Ask HiramShot to replace it.');}
  return json({id:docId,kind},201);
}catch(e){return failure(e);}}
