import {ApiError,database} from './api';
import type {BookingRow} from './booking';
import {COUNT_CLEAN_KYC_SQL} from './verification';

// A known-client decision belongs to one exact booking revision, never to an account.
export const BOOKING_CLIENT_ELIGIBLE_SQL=`EXISTS(SELECT 1 FROM users u WHERE u.auth_user_id=bookings.user_id AND u.account_status='ACTIVE' AND (
 (bookings.verification_basis='DOCUMENT_REVIEW' AND u.kyc_status='VERIFIED' AND u.video_call_verified=1)
 OR (bookings.verification_basis='KNOWN_CLIENT_EXCEPTION' AND EXISTS(SELECT 1 FROM booking_verification_exceptions e WHERE e.booking_id=bookings.id AND e.review_version=bookings.kyc_version AND e.created_at=bookings.verified_at))
))`;

export async function requireBookingApproval(row:BookingRow){
 const db=database();
 const eligible=await db.prepare('SELECT id FROM bookings WHERE id=? AND verified_at IS NOT NULL AND '+BOOKING_CLIENT_ELIGIBLE_SQL).bind(row.id).first();
 if(!eligible)throw new ApiError(409,'The client must be active and this booking must have a current identity review or administrator known-client approval.');
 if(row.verification_basis==='KNOWN_CLIENT_EXCEPTION')return;
 const files=await db.prepare(COUNT_CLEAN_KYC_SQL+' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL').bind(row.id).first<{count:number}>();
 if(files?.count!==5)throw new ApiError(409,'All five clean, distinct document types must remain reviewed before continuing.');
}

export function knownClientDecision(input:Record<string,unknown>,reference:string){
 if(!['RELATIVE','PERSONALLY_KNOWN'].includes(String(input.relationship)))throw new ApiError(400,'Choose relative or personally known client.');
 if(typeof input.reason!=='string'||input.reason.trim().length<12||input.reason.trim().length>500||/[\u0000-\u001f]/.test(input.reason))throw new ApiError(400,'Explain how you know the client in 12–500 characters. Do not include ID numbers.');
 if(input.personallyKnown!==true||input.acceptResponsibility!==true)throw new ApiError(400,'Confirm that you personally know the client and accept responsibility for this booking exception.');
 if(input.confirmReference!==reference)throw new ApiError(400,'Enter the exact booking reference to approve this exception.');
 return {relationship:String(input.relationship),reason:input.reason.trim()};
}
