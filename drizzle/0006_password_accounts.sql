CREATE TABLE `password_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`principal` text NOT NULL,
	`email` text NOT NULL,
	`full_name` text NOT NULL,
	`password_hash` text,
	`verified_at` text,
	`session_version` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_email_unique` ON `password_credentials` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `password_principal_unique` ON `password_credentials` (`principal`);--> statement-breakpoint
CREATE TABLE `password_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`credential_id` text NOT NULL,
	`purpose` text NOT NULL,
	`expected_version` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`used_nonce` text,
	FOREIGN KEY (`credential_id`) REFERENCES `password_credentials`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `password_token_expiry` ON `password_tokens` (`expires_at`);