ALTER TABLE bookings ADD verification_basis text NOT NULL DEFAULT 'DOCUMENT_REVIEW' CHECK(verification_basis IN ('DOCUMENT_REVIEW','KNOWN_CLIENT_EXCEPTION'));
--> statement-breakpoint
ALTER TABLE kyc_documents ADD submission_source text NOT NULL DEFAULT 'CLIENT_PORTAL' CHECK(submission_source IN ('CLIENT_PORTAL','ADMIN_MESSENGER'));
--> statement-breakpoint
ALTER TABLE kyc_documents ADD submitted_by text REFERENCES users(id);
--> statement-breakpoint
ALTER TABLE account_verification_documents ADD submission_source text NOT NULL DEFAULT 'CLIENT_PORTAL' CHECK(submission_source IN ('CLIENT_PORTAL','ADMIN_MESSENGER'));
--> statement-breakpoint
ALTER TABLE account_verification_documents ADD submitted_by text REFERENCES users(id);
--> statement-breakpoint
CREATE TABLE booking_verification_exceptions (
 id text PRIMARY KEY NOT NULL,
 booking_id text NOT NULL REFERENCES bookings(id),
 review_version integer NOT NULL,
 relationship text NOT NULL CHECK(relationship IN ('RELATIVE','PERSONALLY_KNOWN')),
 reason text NOT NULL CHECK(reason LIKE 'v1.%'),
 approved_by text NOT NULL REFERENCES users(id),
 created_at text NOT NULL,
 UNIQUE(booking_id,review_version)
);
--> statement-breakpoint
CREATE TRIGGER known_client_exception_insert BEFORE INSERT ON booking_verification_exceptions BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.approved_by AND role='ADMIN' AND account_status='ACTIVE') THEN RAISE(ABORT,'Only an active administrator can approve an exception') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM bookings b JOIN users u ON u.auth_user_id=b.user_id WHERE b.id=NEW.booking_id AND b.status='verification' AND b.kyc_version=NEW.review_version AND b.personal IS NOT NULL AND b.verified_at IS NULL AND b.archived_at IS NULL AND u.account_status='ACTIVE') THEN RAISE(ABORT,'The pending booking details changed') END;
END;
--> statement-breakpoint
CREATE TRIGGER known_client_exception_no_update BEFORE UPDATE ON booking_verification_exceptions BEGIN SELECT RAISE(ABORT,'Approval history is append-only'); END;
--> statement-breakpoint
CREATE TRIGGER known_client_exception_no_delete BEFORE DELETE ON booking_verification_exceptions BEGIN SELECT RAISE(ABORT,'Approval history is append-only'); END;
--> statement-breakpoint
CREATE TRIGGER booking_admin_upload_source_insert BEFORE INSERT ON kyc_documents WHEN NEW.submission_source='ADMIN_MESSENGER' BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.submitted_by AND role='ADMIN' AND account_status='ACTIVE') THEN RAISE(ABORT,'Administrator upload attribution is required') END;
END;
--> statement-breakpoint
CREATE TRIGGER booking_admin_upload_source_update BEFORE UPDATE OF submission_source,submitted_by ON kyc_documents WHEN NEW.submission_source='ADMIN_MESSENGER' BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.submitted_by AND role='ADMIN' AND account_status='ACTIVE') THEN RAISE(ABORT,'Administrator upload attribution is required') END;
END;
--> statement-breakpoint
CREATE TRIGGER account_admin_upload_source_insert BEFORE INSERT ON account_verification_documents WHEN NEW.submission_source='ADMIN_MESSENGER' BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.submitted_by AND role='ADMIN' AND account_status='ACTIVE') THEN RAISE(ABORT,'Administrator upload attribution is required') END;
END;
--> statement-breakpoint
CREATE TRIGGER account_admin_upload_source_update BEFORE UPDATE OF submission_source,submitted_by ON account_verification_documents WHEN NEW.submission_source='ADMIN_MESSENGER' BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.submitted_by AND role='ADMIN' AND account_status='ACTIVE') THEN RAISE(ABORT,'Administrator upload attribution is required') END;
END;
--> statement-breakpoint
DROP TRIGGER booking_confirmation_kyc_guard;
--> statement-breakpoint
CREATE TRIGGER booking_confirmation_kyc_guard BEFORE UPDATE OF status,lifecycle_status,verification_basis ON bookings
WHEN (NEW.status IN ('verified','reserved','signed','out') OR NEW.lifecycle_status='CONFIRMED_RESERVED') AND (NEW.status<>OLD.status OR NEW.lifecycle_status<>OLD.lifecycle_status OR NEW.verification_basis<>OLD.verification_basis) BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM users WHERE auth_user_id=NEW.user_id AND account_status='ACTIVE') THEN RAISE(ABORT,'The client account must be active') END;
 SELECT CASE WHEN NEW.personal IS NULL OR NEW.verified_at IS NULL THEN RAISE(ABORT,'Identity details and approval are required before confirmation') END;
 SELECT CASE WHEN NEW.verification_basis='KNOWN_CLIENT_EXCEPTION' AND NOT EXISTS(SELECT 1 FROM booking_verification_exceptions WHERE booking_id=NEW.id AND review_version=NEW.kyc_version AND created_at=NEW.verified_at) THEN RAISE(ABORT,'A current administrator exception is required') END;
 SELECT CASE WHEN NEW.verification_basis='DOCUMENT_REVIEW' AND (NEW.live_video_verified_at IS NULL OR NEW.live_video_verified_by IS NULL) THEN RAISE(ABORT,'Live identity review is required before confirmation') END;
 SELECT CASE WHEN NEW.verification_basis='DOCUMENT_REVIEW' AND (SELECT COUNT(DISTINCT kind) FROM kyc_documents WHERE booking_id=NEW.id AND deleted_at IS NULL AND scan_status='CLEAN' AND length(sha256)=64 AND sha256 NOT GLOB '*[^0-9a-f]*' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND kind IN ('government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id'))<>5 THEN RAISE(ABORT,'Five distinct reviewed document types are required') END;
END;
