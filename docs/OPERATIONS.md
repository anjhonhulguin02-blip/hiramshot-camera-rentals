# HiramShot operations — native Cloudflare

Updated 2026-10-29. Production is `https://hiramshot.com`, hosted by `hiramshot-camera-rentals` on the owner's Workers Paid account. D1 `hiramshot-rentals` stores records; private R2 `hiramshot-private` stores files. Public R2 access, workers.dev and preview URLs are disabled. The older Sites deployment is a separate recovery snapshot and must not receive native production builds.

Public storefront/client access is open (`REVIEW_MODE=false`). KYC intake and native email/password are enabled after service acceptance; search indexing and customer review-media uploads remain disabled. Google requests only OpenID/email/profile. Hourly retention is configured. A full human rental lifecycle and synthetic unattended purge readback remain acceptance items; configured cron is not proof of completed deletion.

See [deployment](CLOUDFLARE_LAUNCH.md), [scanner](PRIVATE_SCANNER.md), [email](EMAIL_SIGN_IN.md), [payments](PAYMENTS_SETUP.md), [reviews](REVIEWS.md) and the dated [verification record](VERIFICATION.md). Older verification entries describe historical states.

## Client and administrator workflow

1. Clients sign in using Google or verified email/password. New profiles require the renter and a distinct valid Philippine emergency contact.
2. Select gear, exact pickup/return times and add-ons. Prices use the existing 1–2, 3–6 and 7+ day tiers. Reservation downpayment is 30% of rental charges, with a PHP500 minimum. Refundable deposits are separate liabilities: X5 PHP1,000; X6 PHP1,500; Neo 2 Standard/Fly More PHP800. Existing booked snapshots are preserved.
3. Save verification details and upload five distinct requirements from the Requirements tab or booking: two government IDs, company/school ID, latest billing proof, and selfie holding an ID. Supported uploads are at most 5 MB. A sleeping scanner may require a retry after a minute; scan failures never become stored clean files.
4. Administrators sign in at `/admin` and enroll/unlock their own authenticator. Privileged operations require the private three-email ADMIN_ACCESS_EMAILS allowlist, active role and 15-minute MFA session. Never share MFA keys or private document links.
5. Privately inspect clean files and the billing relationship, then complete the live Messenger physical-ID call. Both document-review and live-call acknowledgements are mandatory. No automated authenticity/OCR decision substitutes for review. Replacing a document invalidates stale approval; a released unit is not guaranteed to remain available.
6. Approved clients see the official GCash/InstaPay QR and outstanding amount. Check actual received funds before recording payment. Confirmation additionally requires physical-unit availability and agreed handover terms. First-time clients use self-pickup in Norzagaray or an agreed meetup; courier collection is restricted to trusted repeat clients.
7. Record rental balance and refundable deposit before turnover and complete contract/release checks. On return, record actual time and supported damage assessment, then clear the return. Record the real external deposit refund separately before settlement; a reversal corrects an error and does not move money.

## Privacy and abuse controls

Private file access is authenticated, role/ownership checked and audited. Files require a clean scan and matching stored hash. Never publish IDs or use public malware sample services. Real identities, QR payloads, secrets and environment files stay outside Git. Only designated administrators may view KYC files after MFA.

Unverified booking attempts: 3 per rolling hour per account/IP; verified accounts have a separate higher limit. KYC and receipt uploads share 10 attempts per rolling hour per account/IP. Turnstile validates hostname/action on registration, booking, verification, upload, receipt and password endpoints. Invalid admitted attempts consume quota; clients sharing a network share its IP quota.

KYC files become due for deletion seven calendar days after cleared return. Hourly cron invokes retention directly. Account profiles, receipts, contracts, audit records and backups have separate policies. Keep non-sensitive transaction history and contract integrity evidence. Perform a synthetic eligible-record/object readback test to accept unattended purge behavior.

Analytics exclude demo records and distinguish rental collections, refundable deposits and damage recovery. Reviews require real cleared rentals, publication consent and moderation. Customer photo/video intake remains off until its dedicated sanitization pipeline is accepted; owner-supplied gear footage is available.

## Build, recovery and costs

For behavior changes run `npm test`, `npm run test:components`, `npx tsc --noEmit` and applicable SQLite/Python checks. Build with `npm run build:cloudflare -- --logLevel warn`, then `npm run deploy:cloudflare`. Use generated `dist/server/wrangler.json`; never `--keep-vars`. Preserve applied migrations 0000–0008. Do not casually rotate encryption keys or restore a database without coordinating private objects and ledger consistency.

If scanner or sender configuration fails, fail closed and repair it. Do not replace scanner failures with clean verdicts or bypass KYC/MFA to meet a deadline. Native email uses accounts@hiramshot.com; Google notices do not contain HiramShot verification links. The owner must complete real password/recovery acceptance.

The scanner uses one fixed container and sleeps after five idle minutes; its accepted image is pinned by digest. Automatic scanner builds are disabled and the temporary broad build token was revoked. Future image updates require an intentional rebuild and positive/negative real-engine acceptance.

Workers Paid has a base charge plus usage, not an all-inclusive cap. Check usage, container awake time and billing alerts. Arrange independent security/legal review and incident response appropriate to the business; app tests are not an independent security certification.
