# HiramShot architecture

The application runs as a Vinext / React full-stack application on a Cloudflare Worker through Sites. The interface uses Outfit and Work Sans, flat Swiss-inspired layouts, white, matte charcoal (#1E1E1E), and sunset orange (#FF5A1F). The existing official logo is retained.

## Components and boundaries

Browser -> Sites authenticated dispatch -> Worker security headers -> server routes -> D1 / private R2.

- Public-compatible storefront, dynamic catalog, exact PHP calculator, policies, and privacy notice.
- Platform sign-in for booking owners. User-owned access is checked server-side for every booking request.
- Owner allowlist plus TOTP second factor. Admin cookie: __Host- prefix, HttpOnly, Secure, SameSite=Strict, 15-minute lifetime. Password handling and primary sessions belong to the platform; this app does not store passwords or falsely claim control over its password hash policy.
- Database-backed catalog with category, package, exact rate tiers, compatible add-ons, deposit and physical unit counts. The migration seeds four packages across three physical units. The owner fills in serial numbers and replacement values in Inventory.
- Quote snapshot recalculated server-side at booking creation. 1–2, 3–6, and 7–30 day tiers; compatible combo discount; 30% downpayment with PHP 500 minimum. Excess downpayment credits refundable deposit.
- Booking state: requested -> verification -> verified -> reserved -> signed -> out -> cleared -> returned. Requested and verification map to PENDING_KYC_REVIEW. Verified means identity approved, awaiting downpayment confirmation. Only reserved maps to CONFIRMED_RESERVED. Cleared & Returned begins the 7-day deletion timer; returned confirms the remaining refundable liability was settled through the ledger. Cancellation is restricted by state and releases inventory.
- Reservation: exact pickup/return timestamps determine started 24-hour rental periods. Atomic interval records and INSERT/UPDATE overlap triggers prevent double-booking of physical units, including across both drone packages. Back-to-back intervals are allowed; overdue units block new reservations. Legacy occupied-day records remain honored. Signed pickup/cutoff times cannot silently change.
- Private KYC: 5 MB limit; extension, declared MIME and magic validation; image metadata stripping; configured malware scan required; randomized R2 keys; no public object endpoint. Upload gate stays disabled until production services are configured.
- Admin document links bind document ID, admin ID, HMAC and five-minute expiry; a valid MFA session is still required. Access, link issuance, deletion and administrative changes are audited.
- Agreement PDF: original logo, booking/rate snapshot, agreed handover details and replacement values, English policies, signature, source IP, server timestamp, canonical content SHA-256. The exact final PDF SHA-256 is stored independently and exposed in its download response. A hash is an integrity check, not a certificate of legal non-repudiation.
- Append-only audit triggers prevent application UPDATE/DELETE; per-event HMAC detects changes. Privileged database administrators can still bypass triggers; off-site anchoring/WORM export is a separate requirement before claiming immutable enterprise logging.
- Retention worker removes KYC objects, personal verification forms, contact fields seven days after cleared return. Hashes and non-sensitive transaction history remain. The scheduled handler and MFA-protected manual runner are implemented. Unattended activation remains pending because automatic approval review rejected the proposed additional service-token ingress. No such ingress was installed.

## Database schema

| Table | Important fields / constraints |
|---|---|
| equipment | id PK, config JSON, updated_at; typed server validation |
| units | id PK, equipment_id FK, active |
| bookings | id PK, user_id + request_key unique; date range; item and quote snapshots; AES-GCM contact and verification envelopes; status/payment flags; contract keys and hashes; return/refund/purge timestamps |
| booking_days | id PK, booking_id FK, unit_id FK, day; UNIQUE(unit_id, day) |
| kyc_documents | id PK, booking_id FK, kind, private object key, MIME, size, SHA-256, scan status, reviewed timestamp/operator, created/deleted timestamps; unique booking/kind and active booking/file hash |
| admin_mfa | user_id PK, encrypted TOTP secret, enabled, created_at |
| mfa_used | used identity/time-counter PK, expiry; rejects replayed OTP |
| security_events | event ID, actor, IP, booking ID, action, timestamp, HMAC; append-only triggers |
| request_limits | hashed IP/account/scope event keys, count, expiry; atomic account/IP rolling-window admission |

Early starter rental tables remain in the first migration for migration-history integrity. Their legacy HTTP write routes return 410; all active rentals use bookings and booking_days.

## Project structure

- app/storefront.tsx, globals.css — responsive catalog and brand interface
- app/book/ — rate calculator, booking progress, verification, document upload, consent and signing
- app/requests/ — private customer booking history
- app/admin/ — MFA enrollment and owner console; catalog editing, bookings and audit views
- app/policies/, app/privacy/ — English policies and privacy notice
- app/api/ — catalog, bookings, KYC documents, agreements, MFA, inventory and maintenance routes
- lib/catalog.ts — dynamic equipment configuration and exact quote calculations
- lib/security.ts — encryption, RBAC, TOTP, cookies, Turnstile, rate limits, signed audit events
- lib/upload.ts — bounded uploads, magic checks and metadata removal
- lib/contract.ts — PDF generation and signature validation
- lib/purge.ts — retention operation
- db/schema.ts, drizzle/ — schema and immutable applied migration history
- worker/index.ts — Worker entry, security headers and scheduled-handler implementation
- public/assets/ — original business logo, real unit photos and short silent kit footage
- tests/ — pricing, date, upload, signature, PDF, database rollback and audit checks
- docs/ — architecture, deployment prerequisites and operating procedures

## Validation limits

Unit and local database checks do not establish end-to-end security certification. Production Turnstile, malware scanning, real KYC review, real payment reconciliation, a complete paid rental lifecycle and unattended retention need service configuration and operational verification. The website does not process payments. No real customer identity documents are used in tests.

References: Cloudflare D1 atomic batches https://developers.cloudflare.com/d1/worker-api/d1-database/#batch; R2 AES-256 at rest https://developers.cloudflare.com/r2/reference/data-security/; Turnstile server-side validation https://developers.cloudflare.com/turnstile/get-started/server-side-validation/; NPC privacy principles https://privacy.gov.ph/implementing-rules%20regulations-data-privacy-act-2012/.

## Accounts and finance upgrade

Accounts are linked to the platform Site-specific identity, with ADMIN, STAFF, and CLIENT roles. Only active accounts can use booking mutations and private rental files. Staff require MFA for operations; administrators additionally control finance, account access, catalog writes, return deductions, and security logs. Account contact, address, occupation, social, and emergency fields use independent AES-GCM envelopes. KYC/video/trust status is reviewed server-side; client requests cannot change these controls.

`users`, `equipment_inventory`, `unit_reservations`, `booking_items`, `payment_receipts`, `payments`, `financial_transactions`, and `payment_reversals` extend the original schema. Bookings reference account UUIDs and retain immutable price snapshots, human-readable references, exact times, destination, and finance assessment amounts. Physical inventory tracks serials, battery codes, SD details, fixed rates, deposits, maintenance, and replacement values. The two DJI packages share the same unit lock.

Money is stored in integer centavos. The ledger classifies rental collections, balance payments, late income, non-cash forfeiture reclassifications, damage recoveries, deposit receipts, deposit applications, and refunds. Deposits never count as rental earnings. A forfeiture offsets the original reservation classification so it does not duplicate income or cash. Return inspection applies documented charges to the liability; excess charges remain receivable. Clearing and releasing inventory happen in the same transaction. The seven-day retention timestamp uses the clearance time rather than a backdated return time.

A financial-version compare-and-swap serializes each booking's payment changes; all related inserts depend on its winning operation ID. Unique administrator/request keys, unique digital payment references, and unique reversal references block duplicates. Ledger, payment, and reversal tables reject application UPDATE/DELETE. Reversals append equal opposite entries; they do not transfer funds. A deposit-balance trigger prevents negative liability. Equipment allocations use integer largest-remainder arithmetic to retain every centavo.

The client portal exposes only the signed-in account's bookings, profile, receipt downloads, contracts, countdowns, and payment history. Finance and user APIs check administrator role plus MFA, even when called without their UI. Private receipt files undergo the same bounded validation and private scanning as verification files. Analytics/export queries exclude synthetic fixtures and include no customer identity documents.

Canonical domain configuration is centralized in `lib/site.ts`; the Worker enforces security headers, configured CORS, canonical alias routing, and private-route noindex. See `../DEPLOYMENT_AND_CUSTOM_DOMAIN.md` for DNS and operational release conditions. No domain has been bound and indexing remains disabled.

## Anti-fraud enforcement

Application registration is explicit: primary platform sign-in alone no longer creates a client database row. `/api/account/register` requires Turnstile action `registration`, consent, and encrypted mandatory renter/emergency contact fields. Profile and KYC validation normalize Philippine mobile aliases and reject a contact number equal to the renter's own number. Existing imported/operator profiles remain accessible and must complete required details before KYC approval.

Five required kinds are government-id-1, government-id-2, company-school-id, proof-of-billing and selfie-with-id. A clean scan and distinct sanitized-file hash are required. SQLite triggers independently block confirmed states without all five reviewed files and a recorded live-video operator. Legacy uploads are marked LEGACY_REVIEW_REQUIRED; they are never automatically promoted to clean. The administrator must affirm document review and the physical-ID video check. A KYC version changes on file/personal changes, preventing approval against a stale review screen. Deleting an unsigned booking's document returns it to review and releases its unit hold; signing and active-rental documents are locked against manual replacement.

Unverified booking attempts are limited to 3 per rolling hour, verified booking attempts to 10, and registration to 3. KYC and receipt upload attempts share 10 per rolling hour. Both the authenticated account and trusted ingress IP must have capacity; a single SQLite statement admits both counters or neither. Valid Turnstile action and hostname are checked server-side for registration, booking and KYC uploads. The common `/api/documents?bookingId=...` endpoint delegates to the same protected booking upload handler.

The booking consent is stored with policy version and time. New contracts prominently prohibit sub-leasing, third-party lending and pawning, and limit identity-document use to lawful restricted evidence channels. Existing signed agreements keep their original bytes and hashes. See the operations record for the legal-language adaptation and [Vercel migration plan](VERCEL_MIGRATION_PLAN.md) for hosting dependencies.
