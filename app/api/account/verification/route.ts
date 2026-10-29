import {assertSameOrigin,ApiError,database,failure,identity,json,readBody} from '../../../../lib/api';
import {ensureAccount} from '../../../../lib/accounts';
import {personalDetails,getBooking} from '../../../../lib/booking';
import {abuseLimit,audit,encrypt,kycReady,verifyTurnstile} from '../../../../lib/security';
import {currentAccountVerification,accountVerificationDocuments,publicAccountVerification,attachAccountVerification} from '../../../../lib/account-verification';
export async function GET(){try{
 const user=await identity(),account=await ensureAccount(user),row=await currentAccountVerification(account.id);
 return json({verification:row?await publicAccountVerification(row):null,documents:row?await accountVerificationDocuments(row.id):[]});
}catch(error){return failure(error);}}
export async function PATCH(request:Request){try{
 assertSameOrigin(request);const user=await identity(),account=await ensureAccount(user),input=await readBody(request);
 if(!kycReady())throw new ApiError(503,'Private verification is not enabled.');
 if(input.action==='attach'){
  await abuseLimit(request,user.userId,'verification');await verifyTurnstile(request,input.turnstileToken,'verification');
  const booking=await getBooking(String(input.bookingId),user.userId);if(booking.status!=='requested'||booking.personal)throw new ApiError(409,'This booking already has verification details. Open it to continue.');
  if(!await attachAccountVerification(request,account.id,user.userId,booking.id))throw new ApiError(409,'Requirements changed or expired. Refresh before trying again.');return json({ok:true,bookingId:booking.id});
 }
 if(input.action!=='personal'||input.sensitiveConsent!==true)throw new ApiError(400,'Specific consent for identity verification is required.');
 await abuseLimit(request,user.userId,'verification');await verifyTurnstile(request,input.turnstileToken,'verification');
 const details=personalDetails(input.personal),now=new Date().toISOString(),db=database(),old=await currentAccountVerification(account.id),id=old?.id||crypto.randomUUID();
 const encrypted=await encrypt({...details,consentedAt:now,consentVersion:'2026-10-29-prebooking-v1'});
 const profileValues=await Promise.all(['mobile','address','socialLink','occupation','emergencyName','emergencyRelationship','emergencyPhone'].map(key=>encrypt({value:details[key]})));
 await audit(request,user.userId,'','account-verification.details.save:'+id);
 const statements:D1PreparedStatement[]=[];
 if(old){
  if(input.reviewVersion!==old.version)throw new ApiError(409,'Your requirements changed. Refresh before saving details.');
  statements.push(db.prepare("UPDATE account_verifications SET personal=?,status='PENDING',verified_at=NULL,reviewed_by=NULL,version=version+1,updated_at=? WHERE id=? AND user_id=? AND version=? AND status IN ('PENDING','APPROVED') AND expires_at>?").bind(encrypted,now,id,account.id,old.version,now));
 }else{
  statements.push(db.prepare("UPDATE account_verifications SET status='PURGING',version=version+1 WHERE user_id=? AND status IN ('PENDING','APPROVED') AND expires_at<=?").bind(account.id,now));
  statements.push(db.prepare("INSERT INTO account_verifications(id,user_id,personal,status,expires_at,created_at,updated_at) VALUES (?,?,?,'PENDING',?,?,?)").bind(id,account.id,encrypted,new Date(Date.now()+7*86400000).toISOString(),now,now));
 }
 statements.push(db.prepare("UPDATE account_verification_documents SET reviewed_at=NULL,reviewed_by=NULL WHERE verification_id=? AND EXISTS(SELECT 1 FROM account_verifications WHERE id=? AND personal=? AND updated_at=? AND status='PENDING')").bind(id,id,encrypted,now));
 statements.push(db.prepare("UPDATE users SET full_name=?,mobile_number=?,complete_address=?,social_media_link=?,occupation_or_company_school=?,emergency_contact_name=?,emergency_contact_relationship=?,emergency_contact_number=?,kyc_status='PENDING_REVIEW',video_call_verified=0,updated_at=? WHERE id=? AND account_status='ACTIVE' AND EXISTS(SELECT 1 FROM account_verifications WHERE id=? AND personal=? AND updated_at=? AND status='PENDING')").bind(details.fullName,...profileValues,now,account.id,id,encrypted,now));
 const result=await db.batch(statements);if(old&&!result[0].meta.changes)throw new ApiError(409,'Requirements changed. Refresh before saving again.');
 return json({ok:true,id},old?200:201);
}catch(error){return failure(error);}}
