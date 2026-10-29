import {env} from '@hiramshot/runtime';
import {ApiError,failure} from '../../../../../../lib/api';
import {audit,digest,requireStaff} from '../../../../../../lib/security';
import {MAX_FILE,sanitizeUpload} from '../../../../../../lib/upload';
import {privateKycDocument} from '../../../../../../lib/private-kyc-document';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{
 const user=await requireStaff(request),{id}=await params;
 const row=await privateKycDocument(id);
 if(!row||row.scan_status!=='CLEAN'||!row.object_key.startsWith('kyc/')||!['image/jpeg','image/png','image/webp'].includes(row.mime)||row.size>MAX_FILE||!env.BUCKET)throw new ApiError(404,'An approved image preview is unavailable.');
 const object=await env.BUCKET.get(row.object_key);if(!object||object.size>MAX_FILE)throw new ApiError(404,'Document no longer exists.');
 const bytes=new Uint8Array(await object.arrayBuffer());if(bytes.length!==row.size||await digest(bytes)!==row.sha256)throw new ApiError(409,'The document integrity check failed. Request a replacement.');
 const extension=row.mime==='image/jpeg'?'jpg':row.mime.split('/')[1],image=sanitizeUpload('verification.'+extension,row.mime,bytes);
 await audit(request,user.userId,row.booking_id,'kyc.preview:'+id+(row.verification_id?':account-verification:'+row.verification_id:''));
 return new Response(image.bytes as BodyInit,{headers:{'Content-Type':image.mime,'Content-Disposition':`inline; filename="verification-${id}.${extension}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin','Referrer-Policy':'no-referrer','Content-Security-Policy':"sandbox; default-src 'none'"}});
 }catch(error){return failure(error);}}
