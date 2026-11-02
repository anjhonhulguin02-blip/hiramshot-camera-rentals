ALTER TABLE `bookings` ADD `archived_at` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `archived_by` text REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `bookings` ADD `archive_reason` text;--> statement-breakpoint
CREATE INDEX `bookings_archive_date` ON `bookings` (`archived_at`,`start_date`,`end_date`);
--> statement-breakpoint
CREATE TRIGGER booking_archive_guard BEFORE UPDATE OF archived_at ON bookings WHEN NEW.archived_at IS NOT NULL BEGIN
 SELECT CASE WHEN NEW.status<>'cancelled' OR NEW.signed_at IS NOT NULL OR NEW.contract_hash IS NOT NULL OR EXISTS(SELECT 1 FROM payments WHERE booking_id=NEW.id) OR EXISTS(SELECT 1 FROM financial_transactions WHERE booking_id=NEW.id) THEN RAISE(ABORT,'Only unpaid unsigned cancelled requests can be archived') END;
END;
--> statement-breakpoint
CREATE TRIGGER archived_booking_payment_guard BEFORE INSERT ON payments WHEN EXISTS(SELECT 1 FROM bookings WHERE id=NEW.booking_id AND archived_at IS NOT NULL) BEGIN SELECT RAISE(ABORT,'Archived booking cannot accept payments'); END;
--> statement-breakpoint
CREATE TRIGGER archived_booking_state_guard BEFORE UPDATE OF status ON bookings WHEN OLD.archived_at IS NOT NULL AND NEW.status<>'cancelled' BEGIN SELECT RAISE(ABORT,'Restore archived request before changing state'); END;
