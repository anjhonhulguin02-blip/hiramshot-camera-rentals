import {env,uploadMaxBytes} from '@hiramshot/runtime';
import {ApiError,database} from './api';
import {catalog,getBooking} from './booking';
import {ensureAccount} from './accounts';
import {audit,applyRequestLimit,verifyTurnstile,digest} from './security';
import {FILE_UPLOAD_LIMIT} from './request-limits';
import {boundedBytes,sanitizeUpload} from './upload';
import {reviewInput,MOST_RENTED_SQL,reviewMediaReady,INSERT_REVIEW_MEDIA_SQL,BUMP_REVIEW_MEDIA_VERSION_SQL} from './review-policy';
import type {ChatGPTUser} from '../app/chatgpt-auth';
type Review={id:string;booking_id:string;client_id:string;equipment_id:string;rating:number;body:string;display_name:string;status:string;version:number;public_consent_at:string|null;moderation_reason:string|null;created_at:string;updated_at:string};
export async function publicReviews(){
 const db=database();const [rows,ratings,picks,gear]=await Promise.all([
  db.prepare("SELECT id,equipment_id,rating,body,display_name,created_at FROM reviews WHERE status='PUBLISHED' AND public_consent_at IS NOT NULL ORDER BY created_at DESC LIMIT 12").all(),
  db.prepare("SELECT equipment_id,COUNT(*) AS review_count,AVG(rating) AS average_rating FROM reviews WHERE status='PUBLISHED' AND public_consent_at IS NOT NULL GROUP BY equipment_id").all(),
  db.prepare(MOST_RENTED_SQL).all<{equipment_id:string;rental_count:number}>(),catalog(),
 ]);
 const media=await db.prepare("SELECT m.id,m.review_id,m.mime FROM review_media m JOIN reviews r ON r.id=m.review_id WHERE r.status='PUBLISHED' AND r.public_consent_at IS NOT NULL AND m.scan_status='CLEAN' AND m.deleted_at IS NULL AND r.id IN (SELECT id FROM reviews WHERE status='PUBLISHED' AND public_consent_at IS NOT NULL ORDER BY created_at DESC LIMIT 12) ORDER BY m.created_at LIMIT 48").all();
 return {reviews:rows.results.map(row=>({...row,media:media.results.filter(m=>m.review_id===row.id).map(m=>({id:m.id,mime:m.mime,url:'/api/review-media/'+m.id}))})),ratings:ratings.results,topPicks:picks.results.map(row=>{const item=gear.find(g=>g.id===row.equipment_id);return {...row,name:item?.name||row.equipment_id,image:item?.image||null};})};
}
export async function clientReviews(user:ChatGPTUser){
 const account=await ensureAccount(user),db=database();
 const [rows,eligible]=await Promise.all([db.prepare('SELECT * FROM reviews WHERE client_id=? ORDER BY created_at DESC LIMIT 40').bind(account.id).all<Review>(),db.prepare("SELECT b.id,b.booking_reference_code,b.items FROM bookings b WHERE b.client_id=? AND b.is_demo=0 AND b.cleared_at IS NOT NULL AND b.status IN ('cleared','returned') ORDER BY b.created_at DESC LIMIT 40").bind(account.id).all()]);
 const media=await db.prepare('SELECT m.id,m.review_id,m.mime FROM review_media m JOIN reviews r ON r.id=m.review_id WHERE r.client_id=? AND m.deleted_at IS NULL AND r.id IN (SELECT id FROM reviews WHERE client_id=? ORDER BY created_at DESC LIMIT 40) ORDER BY m.created_at LIMIT 160').bind(account.id,account.id).all();
 return {reviews:rows.results.map(row=>({...row,media:media.results.filter(m=>m.review_id===row.id).map(m=>({id:m.id,mime:m.mime,url:'/api/review-media/'+m.id}))})),eligible:eligible.results.map(row=>({...row,items:JSON.parse(String(row.items))})),mediaEnabled:reviewMediaReady(env),uploadMaxBytes};
}
export async function saveReview(request:Request,user:ChatGPTUser,body:Record<string,unknown>){
 const account=await ensureAccount(user),db=database(),now=new Date().toISOString();
 await applyRequestLimit(request,user.userId,{scope:'review',limit:5,windowSeconds:3600});
 if(body.action==='withdraw'){
  const changed=await db.prepare("UPDATE reviews SET status='HIDDEN',public_consent_at=NULL,version=version+1,updated_at=? WHERE id=? AND client_id=?").bind(now,String(body.id),account.id).run();if(!changed.meta.changes)throw new ApiError(404,'Review not found.');await audit(request,user.userId,'','review.withdraw');return;
 }
 await verifyTurnstile(request,body.turnstileToken,'review');
 let input;try{input=reviewInput(body);}catch(error){throw new ApiError(400,(error as Error).message);}
 const booking=await getBooking(String(body.bookingId),user.userId),financial=booking as typeof booking&{is_demo?:number};
 if(financial.is_demo||!booking.cleared_at||!['cleared','returned'].includes(booking.status)||!(JSON.parse(booking.items) as {equipmentId:string}[]).some(item=>item.equipmentId===body.equipmentId))throw new ApiError(403,'Reviews are available only for gear from your cleared rental.');
 if(body.id){
  if(!Number.isSafeInteger(body.version))throw new ApiError(400,'Refresh the review before editing.');
  const changed=await db.prepare("UPDATE reviews SET rating=?,body=?,display_name=?,public_consent_at=?,status='PENDING',moderation_reason=NULL,moderated_by=NULL,version=version+1,updated_at=? WHERE id=? AND client_id=? AND booking_id=? AND equipment_id=? AND version=?").bind(input.rating,input.text,input.displayName,now,now,String(body.id),account.id,booking.id,String(body.equipmentId),body.version).run();if(!changed.meta.changes)throw new ApiError(409,'The review changed. Refresh before editing.');
 }else{
  try{await db.prepare('INSERT INTO reviews(id,booking_id,client_id,equipment_id,rating,body,display_name,public_consent_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),booking.id,account.id,String(body.equipmentId),input.rating,input.text,input.displayName,now,now,now).run();}catch(error){if(String(error).includes('UNIQUE'))throw new ApiError(409,'You already reviewed this gear for this booking. Edit that review instead.');throw error;}
 }
 await audit(request,user.userId,booking.id,'review.submit');
}
export async function uploadReviewMedia(request:Request,user:ChatGPTUser,id:string){
 if(!reviewMediaReady(env))throw new ApiError(503,'Photo and video sharing is awaiting private processing setup. Text reviews and ratings are available after a cleared rental.');
 const account=await ensureAccount(user),db=database(),row=await db.prepare("SELECT * FROM reviews WHERE id=? AND client_id=? AND status='PENDING' AND public_consent_at IS NOT NULL").bind(id,account.id).first<Review>();if(!row)throw new ApiError(404,'A pending review is required.');
 await applyRequestLimit(request,user.userId,FILE_UPLOAD_LIMIT);
 const contentType=request.headers.get('content-type');if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site'||!contentType?.startsWith('multipart/form-data'))throw new ApiError(403,'Upload from this website.');
 const bytes=await boundedBytes(request,uploadMaxBytes+65536),form=await new Response(bytes as BodyInit,{headers:{'Content-Type':contentType}}).formData();
 await verifyTurnstile(request,form.get('turnstileToken'),'review_upload');const file=form.get('file');if(!(file instanceof File)||!file.size||file.size>uploadMaxBytes)throw new ApiError(400,'Choose a photo or MP4 video within the upload limit.');
 if(!['image/jpeg','image/png','image/webp','video/mp4'].includes(file.type))throw new ApiError(400,'Use JPG, PNG, WebP or MP4.');
 let source:Uint8Array=new Uint8Array(await file.arrayBuffer());
 if(file.type==='video/mp4'){if(!/\.mp4$/i.test(file.name)||new TextDecoder().decode(source.slice(4,8))!=='ftyp')throw new ApiError(400,'Use a valid MP4 video.');}else try{source=sanitizeUpload(file.name,file.type,source).bytes;}catch{throw new ApiError(400,'The photo format is invalid.');}
 // This private service must decode/re-encode media, remove metadata and scan it.
 const processed=await fetch(env.REVIEW_MEDIA_PROCESSOR_URL!,{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+env.REVIEW_MEDIA_PROCESSOR_TOKEN,'Content-Type':file.type},body:source as BodyInit});
 if(!processed.ok||processed.headers.get('x-hiramshot-clean')!=='true')throw new ApiError(400,'The media could not be safely processed.');
 const mime=processed.headers.get('content-type')?.split(';')[0];if(!mime||!['image/jpeg','image/png','image/webp','video/mp4'].includes(mime))throw new ApiError(400,'Unsupported processed media.');
 let clean:Uint8Array=await boundedBytes(processed as unknown as Request,uploadMaxBytes);
 if(mime==='video/mp4'){if(new TextDecoder().decode(clean.slice(4,8))!=='ftyp')throw new ApiError(400,'Invalid processed video.');}else{const ext=mime==='image/jpeg'?'jpg':mime.split('/')[1];clean=sanitizeUpload('review.'+ext,mime,clean).bytes;}
 const mediaId=crypto.randomUUID(),key='review-media/'+id+'/'+mediaId,hash=await digest(clean),now=new Date().toISOString();
 await env.BUCKET!.put(key,clean as unknown as ReadableStream,{httpMetadata:{contentType:mime},customMetadata:{sha256:hash}});
 try{const saved=await db.batch([db.prepare(INSERT_REVIEW_MEDIA_SQL).bind(mediaId,id,key,mime,clean.length,hash,now,id,account.id,row.version,id),db.prepare(BUMP_REVIEW_MEDIA_VERSION_SQL).bind(now,id,row.version,mediaId)]);if(saved[0].meta.changes!==1||saved[1].meta.changes!==1)throw new ApiError(409,'The review changed or already has four files. Refresh before uploading.');}catch(error){await env.BUCKET!.delete(key);if(String(error).includes('UNIQUE'))throw new ApiError(409,'This file is already attached to your review.');throw error;}
 await audit(request,user.userId,row.booking_id,'review.media.upload');
}
