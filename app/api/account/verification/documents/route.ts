import {env,uploadMaxBytes} from '@hiramshot/runtime';
import {ApiError,database,failure,identity,json} from '../../../../../lib/api';
import {ensureAccount} from '../../../../../lib/accounts';
import {currentAccountVerification} from '../../../../../lib/account-verification';
import {DOCUMENT_KINDS} from '../../../../../lib/verification';
import {FILE_UPLOAD_LIMIT} from '../../../../../lib/request-limits';
import {applyRequestLimit,audit,kycReady,verifyTurnstile} from '../../../../../lib/security';
import {boundedBytes,sanitizeUpload} from '../../../../../lib/upload';
import {scanPrivateFile,ScanFailure} from '../../../../../lib/malware-scanner';
export async function POST(request:Request){try{
 if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')throw new ApiError(403,'Submit documents from this website.');
 const user=await identity(),account=await ensureAccount(user),verification=await currentAccountVerification(account.id);
 if(!verification?.personal||verification.status!=='PENDING')throw new ApiError(409,'Save your verification details first, or ask HiramShot to replace an approved document.');
 if(!kycReady())throw new ApiError(503,'Private verification is not enabled.');await applyRequestLimit(request,user.userId,FILE_UPLOAD_LIMIT);
 let raw;try{raw=await boundedBytes(request,uploadMaxBytes+32768);}catch(error){throw new ApiError(413,(error as Error).message);}
 const body=await new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('content-type')||''},body:raw as BodyInit}).formData(),kind=body.get('kind'),file=body.get('file');
 if(!DOCUMENT_KINDS.includes(kind as typeof DOCUMENT_KINDS[number])||!(file instanceof File))throw new ApiError(400,'Choose a valid document type and file.');await verifyTurnstile(request,body.get('turnstileToken'),'upload');
 let safe;try{safe=sanitizeUpload(file.name,file.type,new Uint8Array(await file.arrayBuffer()));}catch(error){throw new ApiError(400,(error as Error).message);}
 let hash:string;try{hash=await scanPrivateFile(safe.bytes,env);}catch(error){if(error instanceof ScanFailure)throw new ApiError(error.status,error.message);throw error;}
 const db=database(),duplicate=await db.prepare('SELECT id FROM account_verification_documents WHERE verification_id=? AND sha256=? AND deleted_at IS NULL').bind(verification.id,hash).first();if(duplicate)throw new ApiError(409,'Use a different file for each required document type.');
 const id=crypto.randomUUID(),key='kyc/'+crypto.randomUUID(),now=new Date().toISOString();await audit(request,user.userId,'',`account-verification.upload:${verification.id}:${kind}`);
 await env.BUCKET!.put(key,safe.bytes,{httpMetadata:{contentType:safe.mime},customMetadata:{purpose:'identity-verification'}});
 try{
  const saved=await db.prepare("INSERT INTO account_verification_documents(id,verification_id,kind,object_key,mime,size,sha256,scan_status,created_at) SELECT ?,?,?,?,?,?,?,'CLEAN',? WHERE EXISTS(SELECT 1 FROM account_verifications v JOIN users u ON u.id=v.user_id WHERE v.id=? AND v.user_id=? AND v.status='PENDING' AND v.version=? AND v.expires_at>? AND u.account_status='ACTIVE') ON CONFLICT(verification_id,kind) DO UPDATE SET id=excluded.id,object_key=excluded.object_key,mime=excluded.mime,size=excluded.size,sha256=excluded.sha256,scan_status='CLEAN',created_at=excluded.created_at,deleted_at=NULL,reviewed_at=NULL,reviewed_by=NULL WHERE account_verification_documents.deleted_at IS NOT NULL").bind(id,verification.id,kind,key,safe.mime,safe.bytes.length,hash,now,verification.id,account.id,verification.version,now).run();if(!saved.meta.changes)throw new Error('Verification changed.');
 }catch{await env.BUCKET!.delete(key);throw new ApiError(409,'This document type is already submitted or verification changed. Refresh or ask HiramShot for replacement.');}
 return json({id,kind},201);
}catch(error){return failure(error);}}
