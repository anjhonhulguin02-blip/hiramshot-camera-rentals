CREATE TABLE `review_media` (
	`id` text PRIMARY KEY NOT NULL,
	`review_id` text NOT NULL,
	`object_key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`sha256` text NOT NULL,
	`scan_status` text NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`review_id`) REFERENCES `reviews`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `review_media_parent` ON `review_media` (`review_id`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`client_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`rating` integer NOT NULL,
	`body` text NOT NULL,
	`display_name` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`public_consent_at` text,
	`moderation_reason` text,
	`moderated_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`moderated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `review_booking_gear_unique` ON `reviews` (`booking_id`,`equipment_id`);--> statement-breakpoint
CREATE INDEX `review_public_status` ON `reviews` (`status`,`created_at`);
--> statement-breakpoint
CREATE TRIGGER reviews_valid_insert BEFORE INSERT ON reviews WHEN
 NEW.rating NOT BETWEEN 1 AND 5 OR NEW.status<>'PENDING' OR NEW.version<>0 OR NEW.public_consent_at IS NULL
 OR length(trim(NEW.body)) NOT BETWEEN 8 AND 2000 OR length(trim(NEW.display_name)) NOT BETWEEN 2 AND 40
 OR NOT EXISTS(SELECT 1 FROM bookings b JOIN booking_items bi ON bi.booking_id=b.id
 WHERE b.id=NEW.booking_id AND b.client_id=NEW.client_id AND bi.equipment_id=NEW.equipment_id
 AND b.is_demo=0 AND b.cleared_at IS NOT NULL AND b.status IN ('cleared','returned'))
 BEGIN SELECT RAISE(ABORT,'A cleared, matching rental and valid review consent are required'); END;
--> statement-breakpoint
CREATE TRIGGER reviews_valid_update BEFORE UPDATE ON reviews WHEN
 NEW.booking_id<>OLD.booking_id OR NEW.client_id<>OLD.client_id OR NEW.equipment_id<>OLD.equipment_id
 OR NEW.version<>OLD.version+1 OR NEW.rating NOT BETWEEN 1 AND 5
 OR NEW.status NOT IN ('PENDING','PUBLISHED','HIDDEN','REJECTED')
 OR length(trim(NEW.body)) NOT BETWEEN 8 AND 2000 OR length(trim(NEW.display_name)) NOT BETWEEN 2 AND 40
 OR (NEW.status='PUBLISHED' AND (NEW.public_consent_at IS NULL OR NEW.moderated_by IS NULL
 OR EXISTS(SELECT 1 FROM review_media m WHERE m.review_id=NEW.id AND m.deleted_at IS NULL AND m.scan_status<>'CLEAN')
 OR (OLD.status='PUBLISHED' AND (NEW.body<>OLD.body OR NEW.rating<>OLD.rating OR NEW.display_name<>OLD.display_name))))
 BEGIN SELECT RAISE(ABORT,'Review changes require valid consent, version and moderation'); END;
--> statement-breakpoint
CREATE TRIGGER review_media_valid_insert BEFORE INSERT ON review_media WHEN
 NEW.scan_status<>'CLEAN' OR NEW.mime NOT IN ('image/jpeg','image/png','image/webp','video/mp4')
 OR NEW.size NOT BETWEEN 1 AND 5242880 OR length(NEW.sha256)<>64 OR NEW.sha256 GLOB '*[^a-f0-9]*'
 OR substr(NEW.object_key,1,length('review-media/'||NEW.review_id||'/'))<>'review-media/'||NEW.review_id||'/'
 OR NOT EXISTS(SELECT 1 FROM reviews r WHERE r.id=NEW.review_id AND r.status='PENDING' AND r.public_consent_at IS NOT NULL)
 OR (SELECT COUNT(*) FROM review_media WHERE review_id=NEW.review_id AND deleted_at IS NULL)>=4
 BEGIN SELECT RAISE(ABORT,'Only clean media may be attached to a consenting pending review'); END;
--> statement-breakpoint
CREATE UNIQUE INDEX review_media_active_hash ON review_media(review_id,sha256) WHERE deleted_at IS NULL;
