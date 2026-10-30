CREATE TABLE `kyc_object_cleanup` (
	`object_key` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `account_verification_documents` ADD `id_type` text;--> statement-breakpoint
ALTER TABLE `account_verification_documents` ADD `capture_source` text;--> statement-breakpoint
ALTER TABLE `kyc_documents` ADD `id_type` text;--> statement-breakpoint
ALTER TABLE `kyc_documents` ADD `capture_source` text;
--> statement-breakpoint
CREATE UNIQUE INDEX booking_government_id_type ON kyc_documents(booking_id,id_type) WHERE deleted_at IS NULL AND kind IN ('government-id-1','government-id-2') AND id_type IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX account_government_id_type ON account_verification_documents(verification_id,id_type) WHERE deleted_at IS NULL AND kind IN ('government-id-1','government-id-2') AND id_type IS NOT NULL;
--> statement-breakpoint
CREATE TRIGGER booking_id_metadata_version AFTER UPDATE OF id_type,capture_source ON kyc_documents WHEN OLD.id_type IS NOT NEW.id_type OR OLD.capture_source IS NOT NEW.capture_source BEGIN
 UPDATE kyc_documents SET reviewed_at=NULL,reviewed_by=NULL WHERE id=NEW.id;
 UPDATE bookings SET kyc_version=kyc_version+1 WHERE id=NEW.booking_id;
END;
--> statement-breakpoint
CREATE TRIGGER account_id_metadata_version AFTER UPDATE OF id_type,capture_source ON account_verification_documents WHEN OLD.id_type IS NOT NEW.id_type OR OLD.capture_source IS NOT NEW.capture_source BEGIN
 UPDATE account_verification_documents SET reviewed_at=NULL,reviewed_by=NULL WHERE id=NEW.id;
 UPDATE account_verifications SET version=version+1,status='PENDING',verified_at=NULL,reviewed_by=NULL WHERE id=NEW.verification_id AND status IN ('PENDING','APPROVED');
END;
