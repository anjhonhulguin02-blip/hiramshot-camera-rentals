import {assertSameOrigin,ApiError,database,failure,json,readBody} from '../../../../../../lib/api';
import {getBooking} from '../../../../../../lib/booking';
import {knownClientDecision} from '../../../../../../lib/booking-approval';
import {ensureAccount} from '../../../../../../lib/accounts';
import {audit,decrypt,encrypt,requireAdmin} from '../../../../../../lib/security';
import {validateEmergencyContacts} from '../../../../../../lib/verification';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{
 assertSameOrigin(request);const user=await requireAdmin(request),operator=await ensureAccount(user),row=await getBooking((await params).id,user.userId,true) as Awaited<ReturnType<typeof getBooking>>&{kyc_version:number;booking_reference_code?:string},input=await readBody(request),db=database();
 if(row.archived_at||row.status!=='verification'||row.verified_at||!row.personal)throw new ApiError(409,'The client must save their verification details before an administrator can approve this pending booking.');
 const version=Number(input.reviewVersion);if(!Number.isSafeInteger(version)||String(input.reviewVersion)!==String(version)||version!==row.kyc_version)throw new ApiError(409,'The booking details changed. Refresh before approving.');
 const decision=knownClientDecision(input,row.booking_reference_code||'HSR-'+row.id.slice(0,8).toUpperCase());
 const personal=await decrypt(row.personal);try{validateEmergencyContacts(personal.mobile,personal.emergencyName,personal.emergencyRelationship,personal.emergencyPhone);}catch(error){throw new ApiError(409,(error as Error).message);}
 const client=await db.prepare("SELECT id FROM users WHERE auth_user_id=? AND account_status='ACTIVE'").bind(row.user_id).first();if(!client)throw new ApiError(409,'The client account must be active.');
 const id=crypto.randomUUID(),now=new Date().toISOString(),reason=await encrypt({reason:decision.reason});
 await audit(request,user.userId,row.id,'booking.known-client-approval.attempt:'+decision.relationship);
 let result;try{result=await db.batch([
  db.prepare("INSERT INTO booking_verification_exceptions(id,booking_id,review_version,relationship,reason,approved_by,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM bookings WHERE id=? AND status='verification' AND kyc_version=? AND verified_at IS NULL AND personal=? AND archived_at IS NULL)").bind(id,row.id,version,decision.relationship,reason,operator.id,now,row.id,version,row.personal),
  db.prepare("UPDATE bookings SET status='verified',lifecycle_status='PENDING_DOWNPAYMENT',verification_basis='KNOWN_CLIENT_EXCEPTION',verified_at=?,live_video_verified_at=NULL,live_video_verified_by=NULL,updated_at=? WHERE id=? AND status='verification' AND kyc_version=? AND verified_at IS NULL AND EXISTS(SELECT 1 FROM booking_verification_exceptions WHERE id=? AND booking_id=bookings.id AND review_version=bookings.kyc_version)").bind(now,now,row.id,version,id)
 ]);}catch(error){if(/UNIQUE|pending booking details changed/i.test(String(error)))throw new ApiError(409,'This booking changed or already has an approval. Refresh before continuing.');throw error;}
 if(!result[1].meta.changes)throw new ApiError(409,'The booking changed during approval. Refresh before continuing.');
 await audit(request,user.userId,row.id,'booking.known-client-approval.complete:'+id);
 return json({ok:true,verificationBasis:'KNOWN_CLIENT_EXCEPTION'});
}catch(error){return failure(error);}}
