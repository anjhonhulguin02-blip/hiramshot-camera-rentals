DROP TRIGGER IF EXISTS kyc_upload_integrity_insert;
--> statement-breakpoint
CREATE TRIGGER kyc_upload_integrity_insert BEFORE INSERT ON kyc_documents WHEN NEW.scan_status='CLEAN' BEGIN
 SELECT CASE WHEN NEW.kind NOT IN ('government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id') OR length(COALESCE(NEW.sha256,''))<>64 OR NEW.sha256 GLOB '*[^0-9a-f]*' OR NEW.size<1 OR NEW.size>10485760 THEN RAISE(ABORT,'Invalid verification document metadata') END;
END;
--> statement-breakpoint
DROP TRIGGER IF EXISTS kyc_upload_integrity_update;
--> statement-breakpoint
CREATE TRIGGER kyc_upload_integrity_update BEFORE UPDATE OF object_key,sha256,scan_status ON kyc_documents WHEN NEW.scan_status='CLEAN' BEGIN
 SELECT CASE WHEN NEW.kind NOT IN ('government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id') OR length(COALESCE(NEW.sha256,''))<>64 OR NEW.sha256 GLOB '*[^0-9a-f]*' OR NEW.size<1 OR NEW.size>10485760 THEN RAISE(ABORT,'Invalid verification document metadata') END;
END;
--> statement-breakpoint
DROP TRIGGER IF EXISTS account_document_integrity_insert;
--> statement-breakpoint
CREATE TRIGGER account_document_integrity_insert BEFORE INSERT ON account_verification_documents BEGIN
 SELECT CASE WHEN NEW.kind NOT IN ('government-id-1','government-id-2','company-school-id','proof-of-billing','selfie-with-id') OR NEW.scan_status<>'CLEAN' OR length(NEW.sha256)<>64 OR NEW.sha256 GLOB '*[^0-9a-f]*' OR NEW.size<1 OR NEW.size>10485760 THEN RAISE(ABORT,'A clean byte-bound verification file is required') END;
END;
--> statement-breakpoint
DROP TRIGGER IF EXISTS review_media_valid_insert;
--> statement-breakpoint
CREATE TRIGGER review_media_valid_insert BEFORE INSERT ON review_media WHEN
 NEW.scan_status<>'CLEAN' OR NEW.mime NOT IN ('image/jpeg','image/png','image/webp','video/mp4')
 OR NEW.size NOT BETWEEN 1 AND 10485760 OR length(NEW.sha256)<>64 OR NEW.sha256 GLOB '*[^a-f0-9]*'
 OR substr(NEW.object_key,1,length('review-media/'||NEW.review_id||'/'))<>'review-media/'||NEW.review_id||'/'
 OR NOT EXISTS(SELECT 1 FROM reviews r WHERE r.id=NEW.review_id AND r.status='PENDING' AND r.public_consent_at IS NOT NULL)
 OR (SELECT COUNT(*) FROM review_media WHERE review_id=NEW.review_id AND deleted_at IS NULL)>=4
 BEGIN SELECT RAISE(ABORT,'Only clean media may be attached to a consenting pending review'); END;
--> statement-breakpoint
CREATE TRIGGER booking_document_size_update BEFORE UPDATE OF size ON kyc_documents WHEN NEW.size NOT BETWEEN 1 AND 10485760 BEGIN SELECT RAISE(ABORT,'File size must be between 1 byte and 10 MB'); END;
--> statement-breakpoint
CREATE TRIGGER account_document_size_update BEFORE UPDATE OF size ON account_verification_documents WHEN NEW.size NOT BETWEEN 1 AND 10485760 BEGIN SELECT RAISE(ABORT,'File size must be between 1 byte and 10 MB'); END;
--> statement-breakpoint
CREATE TRIGGER review_media_size_update BEFORE UPDATE OF size ON review_media WHEN NEW.size NOT BETWEEN 1 AND 10485760 BEGIN SELECT RAISE(ABORT,'File size must be between 1 byte and 10 MB'); END;
