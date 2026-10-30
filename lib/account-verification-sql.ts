// Numbered bindings are shared by the atomic transfer batch:
// verification ID, internal account ID, booking ID, authenticated principal, version, now.
export const TRANSFER_ACCOUNT_DOCUMENTS_SQL=`INSERT INTO kyc_documents
 (id,booking_id,kind,object_key,mime,size,created_at,sha256,scan_status,reviewed_at,reviewed_by,id_type,capture_source)
 SELECT d.id,?3,d.kind,d.object_key,d.mime,d.size,d.created_at,d.sha256,d.scan_status,d.reviewed_at,d.reviewed_by,d.id_type,d.capture_source
 FROM account_verification_documents d JOIN account_verifications v ON v.id=d.verification_id
 WHERE v.id=?1 AND v.user_id=?2 AND v.version=?5 AND v.status IN ('PENDING','APPROVED') AND v.expires_at>?6
 AND d.deleted_at IS NULL AND d.scan_status='CLEAN'
 AND NOT EXISTS(SELECT 1 FROM account_verification_documents bad WHERE bad.verification_id=v.id AND bad.deleted_at IS NULL AND bad.scan_status<>'CLEAN')
 AND EXISTS(SELECT 1 FROM users WHERE id=?2 AND auth_user_id=?4 AND account_status='ACTIVE')
 AND EXISTS(SELECT 1 FROM bookings WHERE id=?3 AND user_id=?4 AND status='requested' AND personal IS NULL AND verified_at IS NULL)
 AND NOT EXISTS(SELECT 1 FROM kyc_documents WHERE booking_id=?3)`;
export const TRANSFER_ACCOUNT_DETAILS_SQL=`UPDATE bookings SET
 personal=(SELECT personal FROM account_verifications WHERE id=?1),kyc_version=kyc_version+1,
 status=CASE WHEN (SELECT status FROM account_verifications WHERE id=?1)='APPROVED' THEN 'verified' ELSE 'verification' END,
 lifecycle_status=CASE WHEN (SELECT status FROM account_verifications WHERE id=?1)='APPROVED' THEN 'PENDING_DOWNPAYMENT' ELSE 'PENDING_KYC_REVIEW' END,
 verified_at=(SELECT verified_at FROM account_verifications WHERE id=?1),
 live_video_verified_at=(SELECT verified_at FROM account_verifications WHERE id=?1),
 live_video_verified_by=(SELECT reviewed_by FROM account_verifications WHERE id=?1),updated_at=?6
 WHERE id=?3 AND user_id=?4 AND status='requested' AND personal IS NULL AND verified_at IS NULL
 AND EXISTS(SELECT 1 FROM users WHERE id=?2 AND auth_user_id=?4 AND account_status='ACTIVE')
 AND EXISTS(SELECT 1 FROM account_verifications WHERE id=?1 AND user_id=?2 AND version=?5 AND personal IS NOT NULL AND status IN ('PENDING','APPROVED') AND expires_at>?6)
 AND NOT EXISTS(SELECT 1 FROM account_verification_documents WHERE verification_id=?1 AND deleted_at IS NULL AND scan_status<>'CLEAN')
 AND (SELECT COUNT(*) FROM kyc_documents WHERE booking_id=?3)=(SELECT COUNT(*) FROM account_verification_documents WHERE verification_id=?1 AND deleted_at IS NULL)
 AND NOT EXISTS(SELECT 1 FROM kyc_documents WHERE booking_id=?3 AND id NOT IN (SELECT id FROM account_verification_documents WHERE verification_id=?1 AND deleted_at IS NULL))`;
export const LINK_ACCOUNT_VERIFICATION_SQL=`UPDATE account_verifications SET status='LINKED',linked_booking_id=?3,personal=NULL,version=version+1,updated_at=?6
 WHERE id=?1 AND user_id=?2 AND version=?5 AND status IN ('PENDING','APPROVED') AND expires_at>?6
 AND EXISTS(SELECT 1 FROM bookings WHERE id=?3 AND user_id=?4 AND personal=account_verifications.personal AND status IN ('verification','verified'))`;
export const FINISH_ACCOUNT_TRANSFER_SQL=`UPDATE account_verification_documents SET deleted_at=?6,scan_status='TRANSFERRED'
 WHERE verification_id=?1 AND EXISTS(SELECT 1 FROM account_verifications WHERE id=?1 AND user_id=?2 AND status='LINKED' AND linked_booking_id=?3 AND version=?5+1 AND updated_at=?6)
 AND EXISTS(SELECT 1 FROM bookings WHERE id=?3 AND user_id=?4)`;
export const APPROVE_ACCOUNT_DOCUMENTS_SQL=`UPDATE account_verification_documents SET reviewed_at=?3,reviewed_by=?4
 WHERE verification_id=?1 AND deleted_at IS NULL AND scan_status='CLEAN'
 AND EXISTS(SELECT 1 FROM account_verifications WHERE id=?1 AND status='PENDING' AND version=?2 AND expires_at>?3)`;
export const APPROVE_ACCOUNT_VERIFICATION_SQL=`UPDATE account_verifications SET status='APPROVED',verified_at=?3,reviewed_by=?4,version=version+1,updated_at=?3
 WHERE id=?1 AND status='PENDING' AND version=?2 AND expires_at>?3 AND personal IS NOT NULL`;
