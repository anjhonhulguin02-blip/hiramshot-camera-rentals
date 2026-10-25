CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`rental_id` text NOT NULL,
	`action` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `booked_days` (
	`id` text PRIMARY KEY NOT NULL,
	`rental_id` text NOT NULL,
	`gear` text NOT NULL,
	`day` text NOT NULL,
	FOREIGN KEY (`rental_id`) REFERENCES `rentals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gear_day_exclusive` ON `booked_days` (`gear`,`day`);--> statement-breakpoint
CREATE INDEX `days_rental` ON `booked_days` (`rental_id`);--> statement-breakpoint
CREATE TABLE `rentals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`request_key` text NOT NULL,
	`gear` text NOT NULL,
	`package` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`days` integer NOT NULL,
	`battery` integer DEFAULT 0 NOT NULL,
	`addon_total` integer NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`notes` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`quote_total` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rentals_idempotency` ON `rentals` (`user_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `rentals_user` ON `rentals` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `request_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
