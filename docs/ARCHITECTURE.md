# HiramShot architecture

The application runs as a Vinext / React full-stack application on a Cloudflare Worker through Sites. The interface uses Outfit and Work Sans, flat Swiss-inspired layouts, white, matte charcoal (#1E1E1E), and sunset orange (#FF5A1F). The existing official logo is retained.

## Components and boundaries

Browser -> Sites authenticated dispatch -> Worker security headers -> server routes -> D1 / private R2.

- Public-compatible storefront, dynamic catalog, exact PHP calculator, policies, and privacy notice.
- Platform sign-in for booking owners. User-owned access is checked server-side for every booking request.
- Owner allowlist plus TOTP second factor. Admin cookie: __Host- prefix, HttpOnly, Secure, SameSite=Strict, 15-minute lifetime. Password handling and primary sessions belong to the platform; this app does not store passwords or falsely claim control over its password hash policy.
- Database-backed catalog with category, package, exact rate tiers, compatible add-ons, deposit and physical unit counts. Initial fleet is supplied as defaults; owner initializes its physical units through Inventory.
- Quote snapshot recalculated server-side at booking creation. 1–2, 3–6, and 7–30 day tiers; compatible combo discount; 30% downpayment with PHP 500 minimum. Excess downpayment credits refundable deposit.
- Booking state: requested -> reserved -> verification -> verified -> signed -> out -> cleared -> returned. Cleared & Returned begins the 7-day deletion timer; returned also records the full deposit refund. Cancellation is restricted by state and releases inventory.
- Reservation: select physical units, then atomically insert occupied days and update state. Unique unit/day constraint rejects concurrent overlap and rolls back the full bundle. Return date is excluded. Actual pickup/cutoff times and replacement values are recorded before signing.
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
| kyc_documents | id PK, booking_id FK, kind, private object key, MIME, size, created/deleted timestamps; unique booking/document kind |
| admin_mfa | user_id PK, encrypted TOTP secret, enabled, created_at |
| mfa_used | used identity/time-counter PK, expiry; rejects replayed OTP |
| security_events | event ID, actor, IP, booking ID, action, timestamp, HMAC; append-only triggers |
| request_limits | hashed IP/account/scope/time bucket, count, expiry |

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
