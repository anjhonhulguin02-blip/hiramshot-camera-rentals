ALTER TABLE `bookings` ADD `live_video_verified_at` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `live_video_verified_by` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `bookings` ADD `anti_fraud_consent_at` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `anti_fraud_consent_version` text;--> statement-breakpoint
ALTER TABLE `kyc_documents` ADD `sha256` text;--> statement-breakpoint
ALTER TABLE `kyc_documents` ADD `scan_status` text DEFAULT 'LEGACY_REVIEW_REQUIRED' NOT NULL;--> statement-breakpoint
ALTER TABLE `kyc_documents` ADD `reviewed_at` text;--> statement-breakpoint
ALTER TABLE `kyc_documents` ADD `reviewed_by` text REFERENCES users(id);
--> statement-breakpoint
CREATE UNIQUE INDEX active_booking_document_hash ON kyc_documents(booking_id,sha256) WHERE deleted_at IS NULL AND sha256 IS NOT NULL;
--> statement-breakpoint
CREATE TRIGGER kyc_upload_integrity_insert BEFORE INSERT ON kyc_documents WHEN NEW.scan_status='CLEAN' BEGIN
 SELECT CASE WHEN NEW.kind NOT IN ('government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id') OR length(COALESCE(NEW.sha256,''))<>64 OR NEW.sha256 GLOB '*[^0-9a-f]*' OR NEW.size<1 OR NEW.size>5242880 THEN RAISE(ABORT,'Invalid verification document metadata') END;
END;
--> statement-breakpoint
CREATE TRIGGER kyc_upload_integrity_update BEFORE UPDATE OF object_key,sha256,scan_status ON kyc_documents WHEN NEW.scan_status='CLEAN' BEGIN
 SELECT CASE WHEN NEW.kind NOT IN ('government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id') OR length(COALESCE(NEW.sha256,''))<>64 OR NEW.sha256 GLOB '*[^0-9a-f]*' OR NEW.size<1 OR NEW.size>5242880 THEN RAISE(ABORT,'Invalid verification document metadata') END;
END;
--> statement-breakpoint
CREATE TRIGGER users_kyc_emergency_insert BEFORE INSERT ON users WHEN NEW.kyc_status IN ('PENDING_REVIEW','VERIFIED') BEGIN
 SELECT CASE WHEN length(COALESCE(NEW.mobile_number,''))=0 OR length(COALESCE(NEW.emergency_contact_name,''))=0 OR length(COALESCE(NEW.emergency_contact_relationship,''))=0 OR length(COALESCE(NEW.emergency_contact_number,''))=0 THEN RAISE(ABORT,'Required emergency contact details are missing') END;
END;
--> statement-breakpoint
CREATE TRIGGER users_kyc_emergency_update BEFORE UPDATE OF kyc_status,mobile_number,emergency_contact_name,emergency_contact_relationship,emergency_contact_number ON users WHEN NEW.kyc_status IN ('PENDING_REVIEW','VERIFIED') BEGIN
 SELECT CASE WHEN length(COALESCE(NEW.mobile_number,''))=0 OR length(COALESCE(NEW.emergency_contact_name,''))=0 OR length(COALESCE(NEW.emergency_contact_relationship,''))=0 OR length(COALESCE(NEW.emergency_contact_number,''))=0 THEN RAISE(ABORT,'Required emergency contact details are missing') END;
END;
--> statement-breakpoint
CREATE TRIGGER booking_confirmation_kyc_guard BEFORE UPDATE OF status,lifecycle_status ON bookings
WHEN (NEW.status IN ('verified','reserved','signed','out') OR NEW.lifecycle_status='CONFIRMED_RESERVED') AND (NEW.status<>OLD.status OR NEW.lifecycle_status<>OLD.lifecycle_status) BEGIN
 SELECT CASE WHEN NEW.personal IS NULL OR NEW.verified_at IS NULL OR NEW.live_video_verified_at IS NULL OR NEW.live_video_verified_by IS NULL THEN RAISE(ABORT,'Live identity review is required before confirmation') END;
 SELECT CASE WHEN (SELECT COUNT(DISTINCT kind) FROM kyc_documents WHERE booking_id=NEW.id AND deleted_at IS NULL AND scan_status='CLEAN' AND length(sha256)=64 AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL AND kind IN ('government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id'))<>5 THEN RAISE(ABORT,'Five distinct reviewed document types are required') END;
END;

--> statement-breakpoint
CREATE TRIGGER booking_kyc_initial_state BEFORE INSERT ON bookings WHEN NEW.status IN ('verified','reserved','signed','out') OR NEW.lifecycle_status='CONFIRMED_RESERVED' BEGIN
 SELECT RAISE(ABORT,'Create a pending request and complete verification before confirmation');
END;
