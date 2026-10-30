import {database,ApiError} from './api';
import {audit,decrypt} from './security';
import {TRANSFER_ACCOUNT_DOCUMENTS_SQL,TRANSFER_ACCOUNT_DETAILS_SQL,LINK_ACCOUNT_VERIFICATION_SQL,FINISH_ACCOUNT_TRANSFER_SQL} from './account-verification-sql';
export type AccountVerificationRow={id:string;user_id:string;personal:string|null;status:string;version:number;verified_at:string|null;reviewed_by:string|null;linked_booking_id:string|null;expires_at:string;purged_at:string|null;created_at:string;updated_at:string};
export async function currentAccountVerification(accountId:string){return database().prepare("SELECT * FROM account_verifications WHERE user_id=? AND status IN ('PENDING','APPROVED') AND expires_at>? ORDER BY created_at DESC LIMIT 1").bind(accountId,new Date().toISOString()).first<AccountVerificationRow>();}
export async function accountVerificationDocuments(id:string){return (await database().prepare('SELECT id,kind,mime,size,created_at,deleted_at,scan_status,sha256,reviewed_at,id_type,capture_source FROM account_verification_documents WHERE verification_id=? ORDER BY created_at').bind(id).all()).results;}
export async function publicAccountVerification(row:AccountVerificationRow){return {id:row.id,status:row.status,version:row.version,verified_at:row.verified_at,expires_at:row.expires_at,personal:row.personal?await decrypt(row.personal):null};}
export async function attachAccountVerification(request:Request,accountId:string,principal:string,bookingId:string){
 const row=await currentAccountVerification(accountId);if(!row)return false;
 const now=new Date().toISOString(),db=database(),bindings=[row.id,accountId,bookingId,principal,row.version,now];
 await audit(request,principal,bookingId,'account-verification.attach.attempt:'+row.id);
 await db.batch([TRANSFER_ACCOUNT_DOCUMENTS_SQL,TRANSFER_ACCOUNT_DETAILS_SQL,LINK_ACCOUNT_VERIFICATION_SQL,FINISH_ACCOUNT_TRANSFER_SQL].map(sql=>db.prepare(sql).bind(...bindings)));
 const linked=await db.prepare("SELECT id FROM account_verifications WHERE id=? AND status='LINKED' AND linked_booking_id=?").bind(row.id,bookingId).first();
 if(linked)await audit(request,principal,bookingId,'account-verification.attach.complete:'+row.id);
 return !!linked;
}
export async function requireAccountVerification(id:string){
 if(!/^[a-f\d-]{36}$/i.test(id))throw new ApiError(404,'Verification not found.');
 const row=await database().prepare("SELECT * FROM account_verifications WHERE id=? AND status IN ('PENDING','APPROVED') AND expires_at>?").bind(id,new Date().toISOString()).first<AccountVerificationRow>();
 if(!row)throw new ApiError(404,'Verification is expired, linked to a booking, or no longer available.');return row;
}
