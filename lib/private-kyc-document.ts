import {database} from './api';
export type PrivateKycDocument={id:string;booking_id:string;verification_id?:string;verification_version?:number;object_key:string;mime:string;size:number;sha256:string|null;scan_status:string;deleted_at:string|null};
export async function privateKycDocument(id:string,forDeletion=false):Promise<PrivateKycDocument|null>{
 if(!/^[a-f\d-]{36}$/i.test(id))return null;
 const booking=await database().prepare('SELECT * FROM kyc_documents WHERE id=? AND deleted_at IS NULL').bind(id).first<PrivateKycDocument>();if(booking)return booking;
 return database().prepare("SELECT d.*, '' AS booking_id,v.version AS verification_version FROM account_verification_documents d JOIN account_verifications v ON v.id=d.verification_id WHERE d.id=? AND d.deleted_at IS NULL AND v.status IN ('PENDING','APPROVED') AND v.expires_at>?"+(forDeletion?'':" AND d.scan_status='CLEAN'")).bind(id,new Date().toISOString()).first<PrivateKycDocument>();
}
