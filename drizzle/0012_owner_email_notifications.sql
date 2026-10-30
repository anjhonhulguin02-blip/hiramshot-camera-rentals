CREATE TABLE `owner_notification_dispatch` (
	`id` text PRIMARY KEY NOT NULL,
	`lease_token` text,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`day` text DEFAULT '' NOT NULL,
	`attempts_today` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `owner_notifications` (
	`event_key` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`entity_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer DEFAULT 0 NOT NULL,
	`lease_token` text,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`sent_at` integer,
	`message_id` text,
	`last_error` text
);
--> statement-breakpoint
CREATE INDEX `owner_notifications_due` ON `owner_notifications` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `owner_notifications_entity` ON `owner_notifications` (`kind`,`entity_id`,`sent_at`);--> statement-breakpoint
CREATE TRIGGER owner_notify_new_client AFTER INSERT ON users WHEN NEW.role='CLIENT' AND NEW.account_status='ACTIVE' AND NEW.is_demo=0 AND NEW.auth_user_id IS NOT NULL BEGIN
 INSERT INTO owner_notifications(event_key,kind,entity_id,created_at) VALUES ('new-client:'||NEW.id,'NEW_CLIENT',NEW.id,CAST(strftime('%s','now') AS INTEGER)*1000) ON CONFLICT(event_key) DO NOTHING;
END;
--> statement-breakpoint
CREATE TRIGGER owner_notify_new_booking AFTER INSERT ON bookings WHEN NEW.is_demo=0 AND EXISTS(SELECT 1 FROM users WHERE id=NEW.client_id AND account_status='ACTIVE' AND is_demo=0) BEGIN
 INSERT INTO owner_notifications(event_key,kind,entity_id,created_at) VALUES ('new-booking:'||NEW.id,'NEW_BOOKING',NEW.id,CAST(strftime('%s','now') AS INTEGER)*1000) ON CONFLICT(event_key) DO NOTHING;
END;
--> statement-breakpoint
CREATE TRIGGER owner_notify_booking_documents_insert AFTER INSERT ON kyc_documents BEGIN
 INSERT INTO owner_notifications(event_key,kind,entity_id,created_at) SELECT 'booking-kyc-ready:'||p.id||':'||(SELECT group_concat(id,':') FROM (SELECT id FROM kyc_documents WHERE booking_id=p.id AND deleted_at IS NULL AND scan_status='CLEAN' AND length(sha256)=64 AND sha256 NOT GLOB '*[^0-9a-f]*' AND kind IN ('government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id') ORDER BY kind)),'BOOKING_KYC_READY',p.id,CAST(strftime('%s','now') AS INTEGER)*1000 FROM bookings p WHERE p.id=NEW.booking_id AND p.personal IS NOT NULL AND p.verified_at IS NULL AND p.is_demo=0 AND p.status IN ('requested','verification','reserved') AND (SELECT COUNT(DISTINCT kind) FROM kyc_documents WHERE booking_id=p.id AND deleted_at IS NULL AND scan_status='CLEAN' AND length(sha256)=64 AND sha256 NOT GLOB '*[^0-9a-f]*' AND kind IN ('government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id'))=5 ON CONFLICT(event_key) DO NOTHING;
END;
--> statement-breakpoint
CREATE TRIGGER owner_notify_booking_documents_update AFTER UPDATE OF id,object_key,deleted_at,scan_status,id_type ON kyc_documents BEGIN
 INSERT INTO owner_notifications(event_key,kind,entity_id,created_at) SELECT 'booking-kyc-ready:'||p.id||':'||(SELECT group_concat(id,':') FROM (SELECT id FROM kyc_documents WHERE booking_id=p.id AND deleted_at IS NULL AND scan_status='CLEAN' AND length(sha256)=64 AND sha256 NOT GLOB '*[^0-9a-f]*' AND kind IN ('government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id') ORDER BY kind)),'BOOKING_KYC_READY',p.id,CAST(strftime('%s','now') AS INTEGER)*1000 FROM bookings p WHERE p.id=NEW.booking_id AND p.personal IS NOT NULL AND p.verified_at IS NULL AND p.is_demo=0 AND p.status IN ('requested','verification','reserved') AND (SELECT COUNT(DISTINCT kind) FROM kyc_documents WHERE booking_id=p.id AND deleted_at IS NULL AND scan_status='CLEAN' AND length(sha256)=64 AND sha256 NOT GLOB '*[^0-9a-f]*' AND kind IN ('government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id'))=5 ON CONFLICT(event_key) DO NOTHING;
END;
--> statement-breakpoint
CREATE TRIGGER owner_notify_booking_details AFTER UPDATE OF personal,status ON bookings BEGIN
 INSERT INTO owner_notifications(event_key,kind,entity_id,created_at) SELECT 'booking-kyc-ready:'||p.id||':'||(SELECT group_concat(id,':') FROM (SELECT id FROM kyc_documents WHERE booking_id=p.id AND deleted_at IS NULL AND scan_status='CLEAN' AND length(sha256)=64 AND sha256 NOT GLOB '*[^0-9a-f]*' AND kind IN ('government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id') ORDER BY kind)),'BOOKING_KYC_READY',p.id,CAST(strftime('%s','now') AS INTEGER)*1000 FROM bookings p WHERE p.id=NEW.id AND p.personal IS NOT NULL AND p.verified_at IS NULL AND p.is_demo=0 AND p.status IN ('requested','verification','reserved') AND (SELECT COUNT(DISTINCT kind) FROM kyc_documents WHERE booking_id=p.id AND deleted_at IS NULL AND scan_status='CLEAN' AND length(sha256)=64 AND sha256 NOT GLOB '*[^0-9a-f]*' AND kind IN ('government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id'))=5 ON CONFLICT(event_key) DO NOTHING;
END;
--> statement-breakpoint
CREATE TRIGGER owner_notify_account_documents_insert AFTER INSERT ON account_verification_documents BEGIN
 INSERT INTO owner_notifications(event_key,kind,entity_id,created_at) SELECT 'account-kyc-ready:'||p.id||':'||(SELECT group_concat(id,':') FROM (SELECT id FROM account_verification_documents WHERE verification_id=p.id AND deleted_at IS NULL AND scan_status='CLEAN' AND length(sha256)=64 AND sha256 NOT GLOB '*[^0-9a-f]*' AND kind IN ('government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id') ORDER BY kind)),'ACCOUNT_KYC_READY',p.id,CAST(strftime('%s','now') AS INTEGER)*1000 FROM account_verifications p WHERE p.id=NEW.verification_id AND p.personal IS NOT NULL AND p.status='PENDING' AND p.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND (SELECT COUNT(DISTINCT kind) FROM account_verification_documents WHERE verification_id=p.id AND deleted_at IS NULL AND scan_status='CLEAN' AND length(sha256)=64 AND sha256 NOT GLOB '*[^0-9a-f]*' AND kind IN ('government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id'))=5 ON CONFLICT(event_key) DO NOTHING;
END;
--> statement-breakpoint
CREATE TRIGGER owner_notify_account_documents_update AFTER UPDATE OF id,object_key,deleted_at,scan_status,id_type ON account_verification_documents BEGIN
 INSERT INTO owner_notifications(event_key,kind,entity_id,created_at) SELECT 'account-kyc-ready:'||p.id||':'||(SELECT group_concat(id,':') FROM (SELECT id FROM account_verification_documents WHERE verification_id=p.id AND deleted_at IS NULL AND scan_status='CLEAN' AND length(sha256)=64 AND sha256 NOT GLOB '*[^0-9a-f]*' AND kind IN ('government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id') ORDER BY kind)),'ACCOUNT_KYC_READY',p.id,CAST(strftime('%s','now') AS INTEGER)*1000 FROM account_verifications p WHERE p.id=NEW.verification_id AND p.personal IS NOT NULL AND p.status='PENDING' AND p.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND (SELECT COUNT(DISTINCT kind) FROM account_verification_documents WHERE verification_id=p.id AND deleted_at IS NULL AND scan_status='CLEAN' AND length(sha256)=64 AND sha256 NOT GLOB '*[^0-9a-f]*' AND kind IN ('government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id'))=5 ON CONFLICT(event_key) DO NOTHING;
END;
--> statement-breakpoint
CREATE TRIGGER owner_notify_account_details AFTER UPDATE OF personal,status ON account_verifications BEGIN
 INSERT INTO owner_notifications(event_key,kind,entity_id,created_at) SELECT 'account-kyc-ready:'||p.id||':'||(SELECT group_concat(id,':') FROM (SELECT id FROM account_verification_documents WHERE verification_id=p.id AND deleted_at IS NULL AND scan_status='CLEAN' AND length(sha256)=64 AND sha256 NOT GLOB '*[^0-9a-f]*' AND kind IN ('government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id') ORDER BY kind)),'ACCOUNT_KYC_READY',p.id,CAST(strftime('%s','now') AS INTEGER)*1000 FROM account_verifications p WHERE p.id=NEW.id AND p.personal IS NOT NULL AND p.status='PENDING' AND p.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND (SELECT COUNT(DISTINCT kind) FROM account_verification_documents WHERE verification_id=p.id AND deleted_at IS NULL AND scan_status='CLEAN' AND length(sha256)=64 AND sha256 NOT GLOB '*[^0-9a-f]*' AND kind IN ('government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id'))=5 ON CONFLICT(event_key) DO NOTHING;
END;
