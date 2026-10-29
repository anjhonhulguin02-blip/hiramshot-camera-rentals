import {database,failure,json} from '../../../../lib/api';
import {audit,requireStaff} from '../../../../lib/security';
export async function GET(request:Request){try{
 const user=await requireStaff(request),rows=await database().prepare("SELECT v.id,v.status,v.version,v.expires_at,v.created_at,u.full_name,u.email,(SELECT COUNT(*) FROM account_verification_documents d WHERE d.verification_id=v.id AND d.deleted_at IS NULL AND d.scan_status='CLEAN') AS document_count FROM account_verifications v JOIN users u ON u.id=v.user_id WHERE v.status IN ('PENDING','APPROVED') AND v.expires_at>? AND u.is_demo=0 ORDER BY v.created_at DESC LIMIT 100").bind(new Date().toISOString()).all();
 await audit(request,user.userId,'','account-verification.list');return json({verifications:rows.results});
}catch(error){return failure(error);}}
