CREATE TABLE `booking_items` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`package_name` text NOT NULL,
	`rental_centavos` integer NOT NULL,
	`deposit_centavos` integer NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booking_equipment_item` ON `booking_items` (`booking_id`,`equipment_id`);--> statement-breakpoint
CREATE TABLE `equipment_inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`unit_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`package_name` text NOT NULL,
	`unit_name` text NOT NULL,
	`category` text NOT NULL,
	`serial_number` text,
	`battery_codes` text DEFAULT '[]' NOT NULL,
	`sd_card_details` text,
	`rate_1_to_2_days` integer NOT NULL,
	`rate_3_to_6_days` integer NOT NULL,
	`rate_7_plus_days` integer NOT NULL,
	`security_deposit_amount` integer NOT NULL,
	`market_replacement_value` integer,
	`availability_status` text DEFAULT 'AVAILABLE' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_unit_package` ON `equipment_inventory` (`unit_id`,`package_name`);--> statement-breakpoint
CREATE TABLE `financial_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`payment_id` text NOT NULL,
	`booking_id` text NOT NULL,
	`client_id` text NOT NULL,
	`recorded_by_admin_id` text NOT NULL,
	`equipment_id` text,
	`transaction_type` text NOT NULL,
	`amount_centavos` integer NOT NULL,
	`is_net_revenue` integer NOT NULL,
	`escrow_effect_centavos` integer DEFAULT 0 NOT NULL,
	`cash_effect_centavos` integer DEFAULT 0 NOT NULL,
	`line_index` integer NOT NULL,
	`is_demo` integer DEFAULT 0 NOT NULL,
	`remarks` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorded_by_admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_payment_line` ON `financial_transactions` (`payment_id`,`line_index`);--> statement-breakpoint
CREATE INDEX `ledger_booking` ON `financial_transactions` (`booking_id`);--> statement-breakpoint
CREATE INDEX `ledger_month` ON `financial_transactions` (`created_at`);--> statement-breakpoint
CREATE TABLE `payment_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`uploaded_by` text NOT NULL,
	`object_key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payment_reversals` (
	`original_payment_id` text PRIMARY KEY NOT NULL,
	`reversal_payment_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`original_payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reversal_payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`client_id` text NOT NULL,
	`recorded_by_admin_id` text NOT NULL,
	`request_key` text NOT NULL,
	`payment_identity` text,
	`kind` text NOT NULL,
	`amount_centavos` integer NOT NULL,
	`payment_method` text NOT NULL,
	`payment_reference_number` text,
	`receipt_id` text,
	`remarks` text NOT NULL,
	`is_demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorded_by_admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`receipt_id`) REFERENCES `payment_receipts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_idempotency` ON `payments` (`recorded_by_admin_id`,`request_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_reference_unique` ON `payments` (`payment_identity`);--> statement-breakpoint
CREATE TABLE `unit_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`unit_id` text NOT NULL,
	`booking_id` text NOT NULL,
	`pickup_ms` integer NOT NULL,
	`return_ms` integer NOT NULL,
	FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reservation_booking_unit` ON `unit_reservations` (`booking_id`,`unit_id`);--> statement-breakpoint
CREATE INDEX `reservation_overlap` ON `unit_reservations` (`unit_id`,`pickup_ms`,`return_ms`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`auth_user_id` text,
	`role` text DEFAULT 'CLIENT' NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`auth_provider` text DEFAULT 'SITES' NOT NULL,
	`mobile_number` text,
	`complete_address` text,
	`social_media_link` text,
	`occupation_or_company_school` text,
	`emergency_contact_name` text,
	`emergency_contact_relationship` text,
	`emergency_contact_number` text,
	`kyc_status` text DEFAULT 'UNVERIFIED' NOT NULL,
	`video_call_verified` integer DEFAULT 0 NOT NULL,
	`is_trusted_repeat_client` integer DEFAULT 0 NOT NULL,
	`account_status` text DEFAULT 'ACTIVE' NOT NULL,
	`is_demo` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_auth_unique` ON `users` (`auth_user_id`);--> statement-breakpoint
ALTER TABLE `bookings` ADD `client_id` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `bookings` ADD `booking_reference_code` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `pickup_datetime` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `return_datetime` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `destination_or_event` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `turnover_method` text DEFAULT 'SELF_PICKUP_NORZAGARAY' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `lifecycle_status` text DEFAULT 'PENDING_DOWNPAYMENT' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `total_rental_fee_centavos` integer;--> statement-breakpoint
ALTER TABLE `bookings` ADD `security_deposit_centavos` integer;--> statement-breakpoint
ALTER TABLE `bookings` ADD `required_reservation_centavos` integer;--> statement-breakpoint
ALTER TABLE `bookings` ADD `late_penalty_centavos` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `damage_deduction_centavos` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `financial_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `last_financial_operation` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `returned_at` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `is_demo` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `booking_reference_unique` ON `bookings` (`booking_reference_code`);
--> statement-breakpoint
CREATE TRIGGER payments_immutable_update BEFORE UPDATE ON payments BEGIN SELECT RAISE(ABORT,'Financial history is append-only'); END;

--> statement-breakpoint
CREATE TRIGGER payments_immutable_delete BEFORE DELETE ON payments BEGIN SELECT RAISE(ABORT,'Financial history is append-only'); END;

--> statement-breakpoint
CREATE TRIGGER financial_transactions_immutable_update BEFORE UPDATE ON financial_transactions BEGIN SELECT RAISE(ABORT,'Financial history is append-only'); END;

--> statement-breakpoint
CREATE TRIGGER financial_transactions_immutable_delete BEFORE DELETE ON financial_transactions BEGIN SELECT RAISE(ABORT,'Financial history is append-only'); END;

--> statement-breakpoint
CREATE TRIGGER payment_reversals_immutable_update BEFORE UPDATE ON payment_reversals BEGIN SELECT RAISE(ABORT,'Financial history is append-only'); END;

--> statement-breakpoint
CREATE TRIGGER payment_reversals_immutable_delete BEFORE DELETE ON payment_reversals BEGIN SELECT RAISE(ABORT,'Financial history is append-only'); END;

--> statement-breakpoint
CREATE TRIGGER unit_interval_insert BEFORE INSERT ON unit_reservations BEGIN
 SELECT CASE WHEN NEW.return_ms<=NEW.pickup_ms THEN RAISE(ABORT,'Invalid reservation interval') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM unit_reservations r WHERE r.unit_id=NEW.unit_id AND r.pickup_ms<NEW.return_ms AND r.return_ms>NEW.pickup_ms) THEN RAISE(ABORT,'Physical unit reservation overlap') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM unit_reservations r JOIN bookings b ON b.id=r.booking_id WHERE r.unit_id=NEW.unit_id AND b.status='out' AND r.return_ms<CAST(strftime('%s','now') AS INTEGER)*1000 AND r.booking_id<>NEW.booking_id) THEN RAISE(ABORT,'Physical unit is overdue') END;
END;

--> statement-breakpoint
CREATE TRIGGER unit_interval_update BEFORE UPDATE ON unit_reservations BEGIN
 SELECT CASE WHEN NEW.return_ms<=NEW.pickup_ms THEN RAISE(ABORT,'Invalid reservation interval') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM unit_reservations r WHERE r.unit_id=NEW.unit_id AND r.pickup_ms<NEW.return_ms AND r.return_ms>NEW.pickup_ms AND r.id<>NEW.id) THEN RAISE(ABORT,'Physical unit reservation overlap') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM unit_reservations r JOIN bookings b ON b.id=r.booking_id WHERE r.unit_id=NEW.unit_id AND b.status='out' AND r.return_ms<CAST(strftime('%s','now') AS INTEGER)*1000 AND r.booking_id<>NEW.booking_id) THEN RAISE(ABORT,'Physical unit is overdue') END;
END;

--> statement-breakpoint
CREATE TRIGGER ledger_integrity BEFORE INSERT ON financial_transactions BEGIN
 SELECT CASE WHEN typeof(NEW.amount_centavos)<>'integer' OR typeof(NEW.escrow_effect_centavos)<>'integer' OR typeof(NEW.cash_effect_centavos)<>'integer' OR NEW.is_net_revenue NOT IN (0,1) OR NEW.is_demo NOT IN (0,1) THEN RAISE(ABORT,'Invalid ledger amount or flags') END;
 SELECT CASE WHEN NEW.escrow_effect_centavos+COALESCE((SELECT SUM(escrow_effect_centavos) FROM financial_transactions WHERE booking_id=NEW.booking_id),0)<0 THEN RAISE(ABORT,'Refundable deposit cannot become negative') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM payments p WHERE p.id=NEW.payment_id AND p.booking_id=NEW.booking_id AND p.client_id=NEW.client_id AND p.recorded_by_admin_id=NEW.recorded_by_admin_id AND p.is_demo=NEW.is_demo) THEN RAISE(ABORT,'Ledger payment linkage is invalid') END;
END;

--> statement-breakpoint
INSERT INTO users(id,role,full_name,email,created_at,updated_at) VALUES ('00000000-0000-4000-8000-000000000001','ADMIN','HiramShot Administrator','hiramshotrentals@gmail.com','2026-10-26T00:00:00.000Z','2026-10-26T00:00:00.000Z') ON CONFLICT(email) DO NOTHING;
--> statement-breakpoint
INSERT INTO equipment(id,config,updated_at) VALUES ('x5','{"id":"x5","name":"Insta360 X5","category":"Action cameras","description":"For road trips, spontaneous weekends, and every story in between.","image":"/assets/x5.jpg","video":"/assets/x5.mp4","active":true,"units":1,"variants":[{"name":"Standard","deposit":[2000,2000],"tiers":[{"minDays":1,"maxDays":2,"min":650,"max":650},{"minDays":3,"maxDays":6,"min":550,"max":550},{"minDays":7,"maxDays":30,"min":450,"max":450}],"inclusions":["Camera unit","1–2 batteries with security stickers","Charging cable / hub","64GB or 128GB high-speed memory card","Protective case","Invisible Selfie Stick"]}],"addons":[{"id":"battery","name":"Extra battery","min":150,"max":150},{"id":"dive","name":"Official dive case","min":200,"max":200},{"id":"mount","name":"Motorcycle / helmet mount kit","min":150,"max":150}]}','2026-10-26T00:00:00.000Z') ON CONFLICT(id) DO NOTHING;
--> statement-breakpoint
INSERT INTO units(id,equipment_id,active) VALUES ('x5-unit-1','x5',1) ON CONFLICT(id) DO NOTHING;
--> statement-breakpoint
INSERT INTO equipment_inventory(id,unit_id,equipment_id,package_name,unit_name,category,rate_1_to_2_days,rate_3_to_6_days,rate_7_plus_days,security_deposit_amount,created_at,updated_at) VALUES ('37ecab5f-fb1e-4d15-aadc-dfd8b0c1c236','x5-unit-1','x5','Standard','Insta360 X5','Action cameras',650,550,450,2000,'2026-10-26T00:00:00.000Z','2026-10-26T00:00:00.000Z') ON CONFLICT(unit_id,package_name) DO NOTHING;
--> statement-breakpoint
INSERT INTO equipment(id,config,updated_at) VALUES ('x6','{"id":"x6","name":"Insta360 X6","category":"Action cameras","description":"A fresh perspective for your next destination and your next great memory.","image":"/assets/x6.jpg","video":"/assets/x6.mp4","active":true,"units":1,"variants":[{"name":"Standard","deposit":[3000,3000],"tiers":[{"minDays":1,"maxDays":2,"min":800,"max":800},{"minDays":3,"maxDays":6,"min":700,"max":700},{"minDays":7,"maxDays":30,"min":600,"max":600}],"inclusions":["Camera unit","1–2 batteries with security stickers","Charging cable / hub","64GB or 128GB high-speed memory card","Protective case","Invisible Selfie Stick"]}],"addons":[{"id":"battery","name":"Extra battery","min":150,"max":150},{"id":"dive","name":"Official dive case","min":200,"max":200},{"id":"mount","name":"Motorcycle / helmet mount kit","min":150,"max":150}]}','2026-10-26T00:00:00.000Z') ON CONFLICT(id) DO NOTHING;
--> statement-breakpoint
INSERT INTO units(id,equipment_id,active) VALUES ('x6-unit-1','x6',1) ON CONFLICT(id) DO NOTHING;
--> statement-breakpoint
INSERT INTO equipment_inventory(id,unit_id,equipment_id,package_name,unit_name,category,rate_1_to_2_days,rate_3_to_6_days,rate_7_plus_days,security_deposit_amount,created_at,updated_at) VALUES ('de746445-b6f0-415b-beda-ea17d05a391b','x6-unit-1','x6','Standard','Insta360 X6','Action cameras',800,700,600,3000,'2026-10-26T00:00:00.000Z','2026-10-26T00:00:00.000Z') ON CONFLICT(unit_id,package_name) DO NOTHING;
--> statement-breakpoint
INSERT INTO equipment(id,config,updated_at) VALUES ('neo2','{"id":"neo2","name":"DJI Neo 2","category":"Drones","description":"Take the scenic route. Choose the drone alone or the Fly More Combo.","image":"/assets/neo2.jpg","video":"/assets/neo2.mp4","active":true,"units":1,"variants":[{"name":"Standard","deposit":[1500,1500],"tiers":[{"minDays":1,"maxDays":2,"min":500,"max":500},{"minDays":3,"maxDays":6,"min":450,"max":450},{"minDays":7,"maxDays":30,"min":350,"max":350}],"inclusions":["Drone unit only; final accessories confirmed before reservation"]},{"name":"Fly More Combo","deposit":[2000,2000],"tiers":[{"minDays":1,"maxDays":2,"min":700,"max":700},{"minDays":3,"maxDays":6,"min":600,"max":600},{"minDays":7,"maxDays":30,"min":500,"max":500}],"inclusions":["Drone unit","Remote controller","Extra batteries","Charging accessories and case; final inclusions confirmed before reservation"]}],"addons":[{"id":"battery","name":"Extra battery","min":150,"max":150}]}','2026-10-26T00:00:00.000Z') ON CONFLICT(id) DO NOTHING;
--> statement-breakpoint
INSERT INTO units(id,equipment_id,active) VALUES ('neo2-unit-1','neo2',1) ON CONFLICT(id) DO NOTHING;
--> statement-breakpoint
INSERT INTO equipment_inventory(id,unit_id,equipment_id,package_name,unit_name,category,rate_1_to_2_days,rate_3_to_6_days,rate_7_plus_days,security_deposit_amount,created_at,updated_at) VALUES ('49dd499d-a14d-4016-81b9-de228fc13efa','neo2-unit-1','neo2','Standard','DJI Neo 2 Standard','Drones',500,450,350,1500,'2026-10-26T00:00:00.000Z','2026-10-26T00:00:00.000Z') ON CONFLICT(unit_id,package_name) DO NOTHING;
--> statement-breakpoint
INSERT INTO equipment_inventory(id,unit_id,equipment_id,package_name,unit_name,category,rate_1_to_2_days,rate_3_to_6_days,rate_7_plus_days,security_deposit_amount,created_at,updated_at) VALUES ('396c7a04-2111-4c88-b379-0f4364b938b7','neo2-unit-1','neo2','Fly More Combo','DJI Neo 2 Fly More Combo','Drones',700,600,500,2000,'2026-10-26T00:00:00.000Z','2026-10-26T00:00:00.000Z') ON CONFLICT(unit_id,package_name) DO NOTHING;
