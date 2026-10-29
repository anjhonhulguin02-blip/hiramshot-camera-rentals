CREATE TABLE `account_verification_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`verification_id` text NOT NULL,
	`kind` text NOT NULL,
	`object_key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`sha256` text NOT NULL,
	`scan_status` text NOT NULL,
	`reviewed_at` text,
	`reviewed_by` text,
	`created_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`verification_id`) REFERENCES `account_verifications`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_verification_kind` ON `account_verification_documents` (`verification_id`,`kind`);--> statement-breakpoint
CREATE TABLE `account_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`personal` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`verified_at` text,
	`reviewed_by` text,
	`linked_booking_id` text,
	`expires_at` text NOT NULL,
	`purged_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`linked_booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `account_verification_owner` ON `account_verifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `account_verification_expiry` ON `account_verifications` (`status`,`expires_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX account_verification_current ON account_verifications(user_id) WHERE status IN ('PENDING','APPROVED');
--> statement-breakpoint
CREATE UNIQUE INDEX account_verification_active_hash ON account_verification_documents(verification_id,sha256) WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE TRIGGER account_verification_initial BEFORE INSERT ON account_verifications WHEN NEW.status<>'PENDING' OR NEW.verified_at IS NOT NULL OR NEW.reviewed_by IS NOT NULL OR NEW.linked_booking_id IS NOT NULL BEGIN
 SELECT RAISE(ABORT,'Verification must start pending');
END;
--> statement-breakpoint
CREATE TRIGGER account_document_integrity_insert BEFORE INSERT ON account_verification_documents BEGIN
 SELECT CASE WHEN NEW.kind NOT IN ('government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id') OR NEW.scan_status<>'CLEAN' OR length(NEW.sha256)<>64 OR NEW.sha256 GLOB '*[^0-9a-f]*' OR NEW.size<1 OR NEW.size>5242880 THEN RAISE(ABORT,'A clean byte-bound verification file is required') END;
END;
--> statement-breakpoint
CREATE TRIGGER account_document_integrity_update BEFORE UPDATE OF sha256,scan_status ON account_verification_documents WHEN NEW.scan_status='CLEAN' BEGIN
 SELECT CASE WHEN length(NEW.sha256)<>64 OR NEW.sha256 GLOB '*[^0-9a-f]*' THEN RAISE(ABORT,'A clean byte-bound verification file is required') END;
END;
--> statement-breakpoint
CREATE TRIGGER account_document_version_insert AFTER INSERT ON account_verification_documents BEGIN
 UPDATE account_verifications SET version=version+1 WHERE id=NEW.verification_id;
END;
--> statement-breakpoint
CREATE TRIGGER account_document_version_update AFTER UPDATE OF object_key,sha256,scan_status,deleted_at ON account_verification_documents BEGIN
 UPDATE account_verifications SET version=version+1,status='PENDING',verified_at=NULL,reviewed_by=NULL WHERE id=NEW.verification_id AND status IN ('PENDING','APPROVED');
END;
--> statement-breakpoint
CREATE TRIGGER account_verification_approval BEFORE UPDATE OF status ON account_verifications WHEN NEW.status='APPROVED' BEGIN
 SELECT CASE WHEN NEW.personal IS NULL OR NEW.verified_at IS NULL OR NEW.reviewed_by IS NULL THEN RAISE(ABORT,'Live identity review is required') END;
 SELECT CASE WHEN (SELECT COUNT(DISTINCT kind) FROM account_verification_documents WHERE verification_id=NEW.id AND deleted_at IS NULL AND scan_status='CLEAN' AND length(sha256)=64 AND sha256 NOT GLOB '*[^0-9a-f]*' AND reviewed_at=NEW.verified_at AND reviewed_by=NEW.reviewed_by)<>5 THEN RAISE(ABORT,'Five reviewed documents are required') END;
END;
