import {env} from '@hiramshot/runtime';
import {ApiError,failure} from '../../../../../lib/api';
import {bookingPaymentQr} from '../../../../../lib/booking-payment-qr';
import {audit,digest} from '../../../../../lib/security';
import {sanitizeUpload,MAX_FILE} from '../../../../../lib/upload';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{
 const {id}=await params,{user,settings}=await bookingPaymentQr(id),object=await env.BUCKET!.get(settings.key);
 if(!object||object.size>MAX_FILE)throw new ApiError(503,'The payment QR could not load. Contact HiramShot before paying.');
 const bytes=new Uint8Array(await object.arrayBuffer());if(await digest(bytes)!==settings.sha256)throw new ApiError(503,'The payment QR failed its integrity check. Contact HiramShot before paying.');
 const safe=sanitizeUpload(settings.mime==='image/jpeg'?'payment.jpg':'payment.png',settings.mime,bytes);
 await audit(request,user.userId,id,'payment.qr.view');
 return new Response(safe.bytes as BodyInit,{headers:{'Content-Type':safe.mime,'Content-Disposition':`${new URL(request.url).searchParams.get('download')==='1'?'attachment':'inline'}; filename="HiramShot-GCash-QR.${safe.mime==='image/jpeg'?'jpg':'png'}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin','Referrer-Policy':'no-referrer'}});
 }catch(error){return failure(error);}}
