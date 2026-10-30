import {validateGovernmentIdPair} from '../../../../lib/id-document';
import {COUNT_CLEAN_KYC_SQL,CLEAN_KYC_PREDICATE,validateEmergencyContacts,validateReviewAcknowledgement} from '../../../../lib/verification';
import {decrypt} from '../../../../lib/security';
import {findAvailableUnit} from '../../../../lib/inventory';
import { assertSameOrigin, database, failure, identity, json, readBody, ApiError } from '../../../../lib/api';
import { getBooking, safeBooking, personalDetails, DOCUMENT_KINDS } from '../../../../lib/booking';
import { requireAdmin, requireStaff, audit, encrypt, kycReady, abuseLimit, verifyTurnstile } from '../../../../lib/security';
import { ensureAccount } from '../../../../lib/accounts';
import { rentalPeriod, latePenaltyCentavos, toCentavos } from '../../../../lib/finance';
import { financialState, applyReturnDeductions, type FinancialBooking } from '../../../../lib/ledger';
import type { Selection, Quote } from '../../../../lib/catalog';
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,context:Context){try{
 const admin=new URL(request.url).searchParams.get('admin')==='1',user=admin?await requireStaff(request):await identity(),{id}=await context.params,row=await getBooking(id,user.userId,admin);
 const docs=await database().prepare('SELECT id,kind,mime,size,created_at,deleted_at,scan_status,sha256,reviewed_at,id_type,capture_source FROM kyc_documents WHERE booking_id=?').bind(id).all();
 const receipts=await database().prepare('SELECT id,mime,size,created_at FROM payment_receipts WHERE booking_id=? ORDER BY created_at DESC LIMIT 30').bind(id).all();
 if(admin)await audit(request,user.userId,id,'booking.view');return json({booking:await safeBooking(row,admin),documents:docs.results,receipts:receipts.results});
}catch(error){return failure(error);}}
export async function PATCH(request:Request,context:Context){try{
 assertSameOrigin(request);const user=await identity(),account=await ensureAccount(user),{id}=await context.params,row=await getBooking(id,user.userId),input=await readBody(request),db=database(),now=new Date().toISOString();
 if(input?.action==='cancel'){
  if(!['requested','reserved','verification','verified'].includes(row.status))throw new ApiError(409,'This booking cannot be cancelled online. Contact HiramShot.');
  await audit(request,user.userId,id,'booking.cancel.attempt');
  const allowed='EXISTS(SELECT 1 FROM bookings WHERE id=? AND status IN (\'requested\',\'reserved\',\'verification\',\'verified\'))';
  const result=await db.batch([db.prepare('DELETE FROM unit_reservations WHERE booking_id=? AND '+allowed).bind(id,id),db.prepare('DELETE FROM booking_days WHERE booking_id=? AND '+allowed).bind(id,id),db.prepare('UPDATE bookings SET status=\'cancelled\',lifecycle_status=\'CANCELLED_FORFEITED\',purge_at=?,updated_at=? WHERE id=? AND status IN (\'requested\',\'reserved\',\'verification\',\'verified\')').bind(now,now,id)]);
  if(!result[2].meta.changes)throw new ApiError(409,'The booking changed. Refresh before retrying.');return json({ok:true});
 }
 if(input?.action!=='personal'||!['requested','reserved','verification'].includes(row.status)||(row.status==='reserved'&&row.verified_at))throw new ApiError(409,'Verification details can be submitted before reservation confirmation.');
 if(!kycReady())throw new ApiError(503,'The private verification portal has not been enabled.');
 if(input.sensitiveConsent!==true)throw new ApiError(400,'Specific consent for identity verification is required.');
 await abuseLimit(request,user.userId,'verification');await verifyTurnstile(request,input.turnstileToken,'verification');const personal=personalDetails(input.personal);
 await audit(request,user.userId,id,'verification.details.save');
 const encrypted=await encrypt({...personal,consentedAt:now,consentVersion:'2026-10-27-security-v2'});
 const profileValues=await Promise.all(['mobile','address','socialLink','occupation','emergencyName','emergencyRelationship','emergencyPhone'].map(key=>encrypt({value:personal[key]})));
 const saved=await db.batch([
  db.prepare("UPDATE bookings SET personal=?,kyc_version=kyc_version+1,status='verification',lifecycle_status='PENDING_KYC_REVIEW',verified_at=NULL,live_video_verified_at=NULL,live_video_verified_by=NULL,updated_at=? WHERE id=? AND status IN ('requested','reserved','verification') AND verified_at IS NULL").bind(encrypted,now,id),
  db.prepare("UPDATE kyc_documents SET reviewed_at=NULL,reviewed_by=NULL WHERE booking_id=? AND EXISTS(SELECT 1 FROM bookings WHERE id=? AND personal=? AND status='verification')").bind(id,id,encrypted),
  db.prepare("UPDATE users SET full_name=?,mobile_number=?,complete_address=?,social_media_link=?,occupation_or_company_school=?,emergency_contact_name=?,emergency_contact_relationship=?,emergency_contact_number=?,kyc_status='PENDING_REVIEW',video_call_verified=0,updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM bookings WHERE id=? AND personal=? AND status='verification')").bind(personal.fullName,...profileValues,now,account.id,id,encrypted)
 ]);if(!saved[0].meta.changes)throw new ApiError(409,'The booking changed. Refresh before submitting again.');
 return json({ok:true});
}catch(error){return failure(error);}}
export async function POST(request:Request,context:Context){try{
 assertSameOrigin(request);const user=await requireStaff(request),{id}=await context.params,row=await getBooking(id,user.userId,true) as FinancialBooking,input=await readBody(request),db=database(),now=new Date().toISOString(),action=input?.action;
 await audit(request,user.userId,id,`booking.${String(action).slice(0,40)}.attempt`);
 if(action==='reserve'){
  if(row.status!=='verified'||!row.verified_at)throw new ApiError(409,'Complete all five document reviews and the live video verification before confirming a reservation.');
  const client=await db.prepare('SELECT account_status,kyc_status,video_call_verified FROM users WHERE auth_user_id=?').bind(row.user_id).first<{account_status:string;kyc_status:string;video_call_verified:number}>();if(!client||client.account_status!=='ACTIVE'||client.kyc_status!=='VERIFIED'||!client.video_call_verified)throw new ApiError(409,'The client account and video verification must be active before reservation confirmation.');
  const complete=await db.prepare(COUNT_CLEAN_KYC_SQL+' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL').bind(id).first<{count:number}>();if(complete?.count!==5)throw new ApiError(409,'All five clean, distinct document types must remain reviewed before confirmation.');
  const state=await financialState(row);if(state.reservationDueCentavos>0)throw new ApiError(409,'Record the received reservation payment in the financial ledger before reserving equipment.');
  const quote=JSON.parse(row.quote) as Quote,terms=input.terms;
  if(!terms||typeof terms.location!=='string'||terms.location.trim().length<3||terms.location.length>300||!terms.replacementValues||input.customerAgreed!==true)throw new ApiError(400,'Record the agreed location, replacement values, and customer acceptance.');
  let period;try{period=rentalPeriod(terms.pickupAt,terms.returnAt);}catch(error){throw new ApiError(400,(error as Error).message);}
  if(period.days!==row.days||(row.pickup_datetime&&Date.parse(row.pickup_datetime)!==period.pickupMs)||(row.return_datetime&&Date.parse(row.return_datetime)!==period.returnMs))throw new ApiError(409,'Pickup and return times must match the priced booking.');
  for(const item of JSON.parse(row.items) as Selection[])if(!Number.isSafeInteger(terms.replacementValues[item.equipmentId])||terms.replacementValues[item.equipmentId]<1||terms.replacementValues[item.equipmentId]>1000000)throw new ApiError(400,'Record a valid replacement value for every selected model.');
  quote.agreementTerms=terms;const statements:D1PreparedStatement[]=[];
  for(const item of JSON.parse(row.items) as Selection[]){
   const held=await db.prepare('SELECT u.id FROM unit_reservations r JOIN units u ON u.id=r.unit_id WHERE r.booking_id=? AND u.equipment_id=? AND u.active=1 AND r.pickup_ms=? AND r.return_ms=?').bind(id,item.equipmentId,period.pickupMs,period.returnMs).first<{id:string}>();
   const unit=held||await findAvailableUnit(item.equipmentId,period.pickupMs,period.returnMs,row.start_date,row.end_date);
   if(!unit)throw new ApiError(409,'A selected physical unit is unavailable or the fleet is not initialized.');
   if(!held)statements.push(db.prepare('INSERT INTO unit_reservations(id,unit_id,booking_id,pickup_ms,return_ms) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM bookings WHERE id=? AND status=\'verified\' AND financial_version=? AND EXISTS(SELECT 1 FROM users WHERE auth_user_id=bookings.user_id AND account_status=\'ACTIVE\' AND kyc_status=\'VERIFIED\' AND video_call_verified=1))').bind(crypto.randomUUID(),unit.id,id,period.pickupMs,period.returnMs,id,row.financial_version??0));
  }
  statements.push(db.prepare('UPDATE bookings SET status=\'reserved\',lifecycle_status=\'CONFIRMED_RESERVED\',reservation_paid=?,quote=?,pickup_datetime=?,return_datetime=?,updated_at=? WHERE id=? AND status=\'verified\' AND financial_version=? AND EXISTS(SELECT 1 FROM users WHERE auth_user_id=bookings.user_id AND account_status=\'ACTIVE\' AND kyc_status=\'VERIFIED\' AND video_call_verified=1)').bind(state.reservationCollectedCentavos/100,JSON.stringify(quote),terms.pickupAt,terms.returnAt,now,id,row.financial_version??0));
  try{const results=await db.batch(statements);if(!results[results.length-1].meta.changes)throw new ApiError(409,'The booking changed. Refresh before retrying.');}catch(error){if(error instanceof ApiError)throw error;if(/overlap|UNIQUE/i.test(String(error)))throw new ApiError(409,'A selected unit was just reserved. The full reservation was rolled back.');throw error;}
 }else if(action==='verify'){
  if(row.status!=='verification'||!row.personal)throw new ApiError(409,'Complete the required verification details first.');
  try{validateReviewAcknowledgement(input);}catch(error){throw new ApiError(400,(error as Error).message);}
  const reviewVersion=Number(input.reviewVersion);if(!Number.isSafeInteger(reviewVersion)||String(input.reviewVersion)!==String(reviewVersion)||reviewVersion!==(row.kyc_version??0))throw new ApiError(409,'The verification details changed. Refresh all documents before approving.');
  const details=await decrypt(row.personal);try{validateEmergencyContacts(details.mobile,details.emergencyName,details.emergencyRelationship,details.emergencyPhone);}catch(error){throw new ApiError(409,(error as Error).message);}
  const typed=await db.prepare('SELECT kind,id_type,deleted_at FROM kyc_documents WHERE booking_id=?').bind(id).all<{kind:string;id_type:string|null;deleted_at:string|null}>();try{validateGovernmentIdPair(typed.results);}catch(error){throw new ApiError(409,(error as Error).message);}
  const complete=await db.prepare(COUNT_CLEAN_KYC_SQL).bind(id).first<{count:number}>();if(complete?.count!==5)throw new ApiError(409,'All five distinct, clean document types must be uploaded before approval.');
  const operator=await ensureAccount(user);
  const result=await db.batch([
   db.prepare('UPDATE kyc_documents SET reviewed_at=?,reviewed_by=? WHERE booking_id=? AND '+CLEAN_KYC_PREDICATE+" AND EXISTS(SELECT 1 FROM bookings WHERE id=? AND status='verification' AND kyc_version=?)").bind(now,operator.id,id,id,reviewVersion),
   db.prepare("UPDATE bookings SET status='verified',lifecycle_status='PENDING_DOWNPAYMENT',verified_at=?,live_video_verified_at=?,live_video_verified_by=?,updated_at=? WHERE id=? AND status='verification' AND kyc_version=?").bind(now,now,operator.id,now,id,reviewVersion),
   db.prepare("UPDATE users SET kyc_status='VERIFIED',video_call_verified=1,updated_at=? WHERE auth_user_id=? AND EXISTS(SELECT 1 FROM bookings WHERE id=? AND verified_at=? AND status='verified')").bind(now,row.user_id,id,now)
  ]);if(!result[1].meta.changes)throw new ApiError(409,'The booking changed during review. Refresh before retrying.');
 }else if(action==='turnover'){
  if(row.status!=='signed'||!row.contract_hash||!row.verified_at||input.inspectionRecorded!==true||input.contractPhotoRecorded!==true)throw new ApiError(409,'A signed agreement, completed KYC, and handover records are required.');
  const client=await db.prepare('SELECT account_status,kyc_status,video_call_verified FROM users WHERE auth_user_id=?').bind(row.user_id).first<{account_status:string;kyc_status:string;video_call_verified:number}>();if(!client||client.account_status!=='ACTIVE'||client.kyc_status!=='VERIFIED'||!client.video_call_verified)throw new ApiError(409,'The client account and verification must be active before turnover.');
  const occupied=await db.prepare("SELECT 1 FROM unit_reservations own JOIN unit_reservations other ON own.unit_id=other.unit_id JOIN bookings b ON b.id=other.booking_id WHERE own.booking_id=? AND other.booking_id<>? AND b.status='out' LIMIT 1").bind(id,id).first();if(occupied)throw new ApiError(409,'A reserved physical unit has not yet been returned by its previous renter.');
  const files=await db.prepare(COUNT_CLEAN_KYC_SQL+' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL').bind(id).first<{count:number}>();if(files?.count!==5)throw new ApiError(409,'All required reviewed verification documents must remain available before turnover.');
  const state=await financialState(row);if(state.rentalBalanceCentavos||state.depositDueCentavos)throw new ApiError(409,'Record the complete rental balance and refundable deposit before turnover.');
  if(!['Self-pickup','Meetup'].includes(input.method))throw new ApiError(400,'Use self-pickup in Norzagaray or an agreed meetup. First-time courier collection is prohibited.');
  const quote=JSON.parse(row.quote) as Quote;if(quote.agreementTerms?.returnAt!==input.returnCutoff)throw new ApiError(409,'The return cutoff must match the signed agreement.');
  await db.prepare('UPDATE bookings SET status=\'out\',lifecycle_status=\'ACTIVE_TURNED_OVER\',turnover=?,updated_at=? WHERE id=? AND status=\'signed\'').bind(JSON.stringify({method:input.method,returnCutoff:input.returnCutoff,inspectionRecorded:true,contractPhotoRecorded:true,at:now}),now,id).run();
 }else if(action==='clear-return'){
  await requireAdmin(request);
  if(row.status!=='out'||!Array.isArray(input.inspection)||!['lenses','screen','gimbal-propellers','batteries','memory-card','accessories'].every(k=>input.inspection.includes(k)))throw new ApiError(409,'Complete the entire return inspection.');
  const returnedAt=input.returnedAt||now;if(typeof returnedAt!=='string'||!Number.isFinite(Date.parse(returnedAt))||Date.parse(returnedAt)>Date.now()+300000)throw new ApiError(400,'Enter the actual return time.');
  const quote=JSON.parse(row.quote) as Quote,cutoff=row.return_datetime||quote.agreementTerms?.returnAt;if(!cutoff)throw new ApiError(409,'An agreed return cutoff is required.');
  if(Date.parse(returnedAt)<Date.parse(row.pickup_datetime||quote.agreementTerms?.pickupAt||row.start_date))throw new ApiError(400,'The actual return cannot precede pickup.');
  const late=latePenaltyCentavos(Date.parse(returnedAt),Date.parse(cutoff),Math.round((quote.totalMax??0)/row.days*100));
  let damage=0;try{if(input.damagePhp&&String(input.damagePhp)!=='0')damage=toCentavos(input.damagePhp);}catch(error){throw new ApiError(400,(error as Error).message);}
  if(input.assessmentConfirmed!==true)throw new ApiError(400,'Confirm that the assessed late or damage deductions were documented and communicated to the client.');
  await applyReturnDeductions(request,user,row,late,damage,returnedAt,String(input.requestKey));
 }else if(action==='refund'){
  await requireAdmin(request);const state=await financialState(row);
  if(row.status!=='cleared'||state.escrowHeldCentavos!==0)throw new ApiError(409,'Record the remaining deposit refund or approved deductions in the ledger first.');
  await db.prepare('UPDATE bookings SET status=\'returned\',refunded_at=?,updated_at=? WHERE id=? AND status=\'cleared\'').bind(now,now,id).run();
 }else throw new ApiError(400,'Unknown booking action.');
 await audit(request,user.userId,id,`booking.${action}.complete`);return json({ok:true});
}catch(error){return failure(error);}}
