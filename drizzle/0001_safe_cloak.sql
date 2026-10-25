CREATE TABLE `admin_mfa` (
	`user_id` text PRIMARY KEY NOT NULL,
	`secret` text NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `booking_days` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`day` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unit_day_exclusive` ON `booking_days` (`unit_id`,`day`);--> statement-breakpoint
CREATE INDEX `booking_days_booking` ON `booking_days` (`booking_id`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`request_key` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`days` integer NOT NULL,
	`items` text NOT NULL,
	`quote` text NOT NULL,
	`status` text DEFAULT 'requested' NOT NULL,
	`contact` text NOT NULL,
	`personal` text,
	`verified_at` text,
	`signed_at` text,
	`contract_key` text,
	`contract_hash` text,
	`contract_content_hash` text,
	`reservation_paid` integer DEFAULT 0 NOT NULL,
	`paid_total` integer DEFAULT 0 NOT NULL,
	`turnover` text,
	`cleared_at` text,
	`refunded_at` text,
	`purge_at` text,
	`purged_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booking_idempotency` ON `bookings` (`user_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `booking_owner` ON `bookings` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `booking_purge` ON `bookings` (`purge_at`);--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` text PRIMARY KEY NOT NULL,
	`config` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `kyc_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`kind` text NOT NULL,
	`object_key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booking_document_kind` ON `kyc_documents` (`booking_id`,`kind`);--> statement-breakpoint
CREATE TABLE `mfa_used` (
	`key` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `security_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`ip` text NOT NULL,
	`booking_id` text NOT NULL,
	`action` text NOT NULL,
	`created_at` text NOT NULL,
	`mac` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `units` (
	`id` text PRIMARY KEY NOT NULL,
	`equipment_id` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `units_equipment` ON `units` (`equipment_id`);--> statement-breakpoint
CREATE TRIGGER security_events_no_update BEFORE UPDATE ON security_events BEGIN SELECT RAISE(ABORT, 'Security events are append-only'); END;
--> statement-breakpoint
CREATE TRIGGER security_events_no_delete BEFORE DELETE ON security_events BEGIN SELECT RAISE(ABORT, 'Security events are append-only'); END;
