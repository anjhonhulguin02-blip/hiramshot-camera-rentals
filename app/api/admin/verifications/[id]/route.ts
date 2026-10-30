import {validateGovernmentIdPair} from '../../../../../lib/id-document';
import {assertSameOrigin,ApiError,database,failure,json,readBody} from '../../../../../lib/api';
import {ensureAccount} from '../../../../../lib/accounts';
import {accountVerificationDocuments,publicAccountVerification,requireAccountVerification} from '../../../../../lib/account-verification';
import {audit,decrypt,requireStaff} from '../../../../../lib/security';
import {CLEAN_KYC_PREDICATE,validateEmergencyContacts,validateReviewAcknowledgement} from '../../../../../lib/verification';
import {APPROVE_ACCOUNT_DOCUMENTS_SQL,APPROVE_ACCOUNT_VERIFICATION_SQL} from '../../../../../lib/account-verification-sql';
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Context){try{
 const user=await requireStaff(request),row=await requireAccountVerification((await params).id),client=await database().prepare('SELECT full_name,email FROM users WHERE id=?').bind(row.user_id).first();
 await audit(request,user.userId,'','account-verification.view:'+row.id);return json({verification:await publicAccountVerification(row),client,documents:await accountVerificationDocuments(row.id)});
}catch(error){return failure(error);}}
export async function POST(request:Request,{params}:Context){try{
 assertSameOrigin(request);const user=await requireStaff(request),row=await requireAccountVerification((await params).id),input=await readBody(request),db=database();
 if(input.action!=='approve'||row.status!=='PENDING'||!row.personal)throw new ApiError(409,'Pending verification details are required.');
 try{validateReviewAcknowledgement(input);}catch(error){throw new ApiError(400,(error as Error).message);}
 const version=Number(input.reviewVersion);if(!Number.isSafeInteger(version)||String(input.reviewVersion)!==String(version)||version!==row.version)throw new ApiError(409,'The requirements changed. Refresh all documents before approval.');
 const details=await decrypt(row.personal);try{validateEmergencyContacts(details.mobile,details.emergencyName,details.emergencyRelationship,details.emergencyPhone);}catch(error){throw new ApiError(409,(error as Error).message);}
 const client=await db.prepare("SELECT id FROM users WHERE id=? AND account_status='ACTIVE'").bind(row.user_id).first();if(!client)throw new ApiError(409,'The client account must be active.');
 const typed=await accountVerificationDocuments(row.id);try{validateGovernmentIdPair(typed as {kind:string;id_type:string|null;deleted_at:string|null}[]);}catch(error){throw new ApiError(409,(error as Error).message);}
 const complete=await db.prepare('SELECT COUNT(DISTINCT kind) AS count FROM account_verification_documents WHERE verification_id=? AND '+CLEAN_KYC_PREDICATE).bind(row.id).first<{count:number}>();if(complete?.count!==5)throw new ApiError(409,'All five distinct clean documents are required before approval.');
 const operator=await ensureAccount(user),now=new Date().toISOString();await audit(request,user.userId,'','account-verification.approve.attempt:'+row.id);
 const result=await db.batch([
  db.prepare(APPROVE_ACCOUNT_DOCUMENTS_SQL).bind(row.id,version,now,operator.id),
  db.prepare(APPROVE_ACCOUNT_VERIFICATION_SQL).bind(row.id,version,now,operator.id),
  db.prepare("UPDATE users SET kyc_status='VERIFIED',video_call_verified=1,updated_at=? WHERE id=? AND account_status='ACTIVE' AND EXISTS(SELECT 1 FROM account_verifications WHERE id=? AND status='APPROVED' AND verified_at=? AND reviewed_by=?)").bind(now,row.user_id,row.id,now,operator.id),
 ]);if(!result[1].meta.changes)throw new ApiError(409,'Requirements changed during approval. Refresh and review again.');
 await audit(request,user.userId,'','account-verification.approve.complete:'+row.id);return json({ok:true});
}catch(error){return failure(error);}}
