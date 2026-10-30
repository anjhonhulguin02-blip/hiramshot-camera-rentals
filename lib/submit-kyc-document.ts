import {env,uploadMaxBytes} from '@hiramshot/runtime';
import {ApiError,database} from './api';
import {DOCUMENT_KINDS} from './verification';
import {captureMetadata,governmentKind,validateIdentityPhoto} from './id-document';
import {applyRequestLimit,audit,verifyTurnstile} from './security';
import {FILE_UPLOAD_LIMIT} from './request-limits';
import {boundedBytes,sanitizeUpload} from './upload';
import {scanPrivateFile,ScanFailure} from './malware-scanner';
type Scope={type:'booking';id:string}|{type:'account';id:string;version:number};
export async function submitKycDocument(request:Request,principal:string,scope:Scope){
 await applyRequestLimit(request,principal,FILE_UPLOAD_LIMIT);
 let raw;try{raw=await boundedBytes(request,uploadMaxBytes+32768);}catch(error){throw new ApiError(413,(error as Error).message);}
 let body:FormData;try{body=await new Request(request.url,{method:'POST',headers:{'Content-Type':request.headers.get('content-type')||''},body:raw as BodyInit}).formData();}catch{throw new ApiError(400,'Choose a photo or document to submit.');}
 const kind=body.get('kind'),file=body.get('file');if(!DOCUMENT_KINDS.includes(kind as typeof DOCUMENT_KINDS[number])||!(file instanceof File))throw new ApiError(400,'Choose a valid requirement and photo.');
 await verifyTurnstile(request,body.get('turnstileToken'),'upload');
 let metadata,safe;try{metadata=captureMetadata(String(kind),body.get('idType'),body.get('captureSource'));safe=sanitizeUpload(file.name,file.type,new Uint8Array(await file.arrayBuffer()));validateIdentityPhoto(String(kind),safe.bytes,safe.mime);}catch(error){throw new ApiError(400,(error as Error).message);}
 const db=database(),table=scope.type==='booking'?'kyc_documents':'account_verification_documents',parent=scope.type==='booking'?'booking_id':'verification_id';
 const old=await db.prepare(`SELECT object_key,reviewed_at,deleted_at FROM ${table} WHERE ${parent}=? AND kind=?`).bind(scope.id,kind).first<{object_key:string;reviewed_at:string|null;deleted_at:string|null}>();
 if(old?.reviewed_at&&!old.deleted_at)throw new ApiError(409,'This document has already been reviewed. Ask HiramShot for a replacement request.');
 if(governmentKind(String(kind))){const other=await db.prepare(`SELECT id FROM ${table} WHERE ${parent}=? AND kind IN ('government-id-1','government-id-2') AND kind<>? AND id_type=? AND deleted_at IS NULL`).bind(scope.id,kind,metadata.idType).first();if(other)throw new ApiError(409,'Choose a different government ID type. One ID cannot count as both required IDs.');}
 let hash:string;try{hash=await scanPrivateFile(safe.bytes,env);}catch(error){if(error instanceof ScanFailure)throw new ApiError(error.status,error.message);throw error;}
 const duplicate=await db.prepare(`SELECT id FROM ${table} WHERE ${parent}=? AND sha256=? AND deleted_at IS NULL AND kind<>?`).bind(scope.id,hash,kind).first();if(duplicate)throw new ApiError(409,'Use a different document for each required type.');
 const id=crypto.randomUUID(),key='kyc/'+crypto.randomUUID(),now=new Date().toISOString(),bookingId=scope.type==='booking'?scope.id:'';
 await audit(request,principal,bookingId,`kyc.submit:${scope.type}:${scope.id}:${kind}:${metadata.idType||'supporting-document'}`);
 await env.BUCKET!.put(key,safe.bytes,{httpMetadata:{contentType:safe.mime},customMetadata:{purpose:'identity-verification'}});
 const guard=scope.type==='booking'?"EXISTS(SELECT 1 FROM bookings b JOIN users u ON u.auth_user_id=b.user_id WHERE b.id=? AND b.user_id=? AND b.status IN ('requested','verification','reserved') AND b.verified_at IS NULL AND b.personal IS NOT NULL AND u.account_status='ACTIVE')":"EXISTS(SELECT 1 FROM account_verifications v JOIN users u ON u.id=v.user_id WHERE v.id=? AND u.auth_user_id=? AND v.status='PENDING' AND v.version=? AND v.expires_at>? AND u.account_status='ACTIVE')";
 const guards=scope.type==='booking'?[scope.id,principal]:[scope.id,principal,scope.version,now];
 try{
  const statements=[db.prepare(`INSERT INTO ${table}(id,${parent},kind,object_key,mime,size,created_at,sha256,scan_status,id_type,capture_source) SELECT ?,?,?,?,?,?,?,?,'CLEAN',?,? WHERE ${guard} ON CONFLICT(${parent},kind) DO UPDATE SET id=excluded.id,object_key=excluded.object_key,mime=excluded.mime,size=excluded.size,created_at=excluded.created_at,sha256=excluded.sha256,scan_status='CLEAN',id_type=excluded.id_type,capture_source=excluded.capture_source,deleted_at=NULL,reviewed_at=NULL,reviewed_by=NULL WHERE (${table}.deleted_at IS NOT NULL OR ${table}.reviewed_at IS NULL) AND ${table}.object_key=?`).bind(id,scope.id,kind,key,safe.mime,safe.bytes.length,now,hash,metadata.idType,metadata.captureSource,...guards,old?.object_key||'')];
  if(old&&!old.deleted_at&&old.object_key!==key)statements.push(db.prepare(`INSERT INTO kyc_object_cleanup(object_key,created_at) SELECT ?,? WHERE EXISTS(SELECT 1 FROM ${table} WHERE id=? AND object_key=?) ON CONFLICT(object_key) DO NOTHING`).bind(old.object_key,now,id,key));
  const result=await db.batch(statements);if(!result[0].meta.changes)throw new Error('Verification changed.');
 }catch{await env.BUCKET!.delete(key);throw new ApiError(409,'The ID type or verification changed. Refresh before submitting again.');}
 if(old&&!old.deleted_at&&old.object_key!==key){try{await env.BUCKET!.delete(old.object_key);await db.prepare('DELETE FROM kyc_object_cleanup WHERE object_key=?').bind(old.object_key).run();}catch{/* The retention worker retries this private-object cleanup. */}}
 return {id,kind,idType:metadata.idType,status:'RECEIVED_FOR_MANUAL_REVIEW'};
}
