ALTER TABLE `bookings` ADD `kyc_version` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TRIGGER kyc_version_insert AFTER INSERT ON kyc_documents BEGIN
 UPDATE bookings SET kyc_version=kyc_version+1 WHERE id=NEW.booking_id;
END;
--> statement-breakpoint
CREATE TRIGGER kyc_version_content_update AFTER UPDATE OF object_key,sha256,scan_status,deleted_at ON kyc_documents BEGIN
 UPDATE bookings SET kyc_version=kyc_version+1 WHERE id=NEW.booking_id;
END;
