# Current Cloudflare launch

Use [CLOUDFLARE_LAUNCH.md](CLOUDFLARE_LAUNCH.md) for the native Worker, Google OAuth, private review and domain setup. Older Sites-specific operating notes below are retained for the separate recovery deployment. The native app has an hourly scheduler configuration; unattended deletion still requires a synthetic runtime acceptance check.

# Production configuration and launch checklist

Configured through Sites: random 32-byte DATA_ENCRYPTION_KEY (base64), ADMIN_SESSION_SECRET, AUDIT_HMAC_KEY, DOWNLOAD_SECRET, PURGE_SECRET. Values are secrets and are not written to the source repository. ADMIN_EMAIL and CONTACT_EMAIL are hiramshotcamerarentals@gmail.com. KYC_RETENTION_DAYS is seven; the application currently enforces seven days directly. The site remains owner-private.

Before customer launch:
1. Configure a real TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY for the deployed hostname. Booking submission fails closed until these are present. Tokens are validated server-side, single-use, hostname/action-bound, and expire per Cloudflare policy.
2. Configure HTTPS MALWARE_SCANNER_URL and MALWARE_SCANNER_TOKEN. The private scanner must accept a raw octet-stream POST with bearer authorization and return JSON {"clean":true} only after validated decoding and malware/content checks. A failed or unavailable scanner rejects the upload. Scanner content retention and data-processing terms require owner approval.
3. Sign in with the configured owner account, enroll an authenticator through /admin, and complete seeded physical inventory serials, accessory codes, and replacement values. Additional site-specific user IDs may be configured through ADMIN_USER_IDS. The platform owner may configure these settings; customer accounts cannot grant themselves access.
4. Verify private bucket access, admin MFA, upload/download controls, retention, backups, privacy notice and incident response. Only then set KYC_ENABLED=true and deploy the saved source version to apply the environment revision.
5. Activate the retention runner through an approved unattended method. Worker scheduled handling and /api/maintenance/purge exist; the endpoint currently requires an MFA admin session or the existing timestamped maintenance HMAC. A proposed extra service-token ingress was rejected by automatic approval review and was not installed. Do not claim an active cron until an unattended run and readback succeed.
6. Document the audit-log retention period and external integrity anchoring; arrange independent security review and review the rental terms with a qualified Philippine adviser before general customer use.
7. Complete a synthetic end-to-end booking through payment confirmation, KYC, signing, release, cleared return, deposit refund and seven-day purge. Confirm website visibility deliberately before changing the owner-private audience.

Primary sign-in and password security are managed by Sites. This app cannot enforce a particular hash algorithm or cookie flags inside that external provider. Its own admin second-factor cookie enforces HttpOnly, Secure and SameSite=Strict.

No notification email is sent automatically; customers use their private booking view, and the team uses the configured contact email. No payment provider, automatic bank verification or third-party courier integration is configured.

## Test commands
node --experimental-strip-types --import ./tests/resolve-types.mjs --test tests/rental.test.ts
python tests/database.py
node node_modules/typescript/bin/tsc --noEmit

Build and publish through the Sites skill helpers. Applied migrations and journal entries must never be rewritten. Local preview data and hosted data are separate.

## Account and financial operations

Use `/account` for client profile, booking, contract, payment, and deposit history. `/admin` requires platform sign-in and an authenticator code. The finance, account manager, ledger correction, return assessment, catalog edit, and security modules require ADMIN. STAFF may manage reservation, identity review, document access, and turnover after MFA; the server independently enforces every permission.

Review all five distinct, clean KYC documents and complete the live physical-ID video check before approving identity. Confirm the active account, agreed handover terms, downpayment and physical-unit availability before confirming a reservation. Record the rental balance and refundable deposit before turnover. A receipt upload does not mark a payment paid. After inspection, confirm the actual return time and documented damage assessment, then clear the return. The server applies charges against held deposits and schedules KYC deletion seven days after clearance. Complete the actual external refund and record that payout in the ledger before finalizing deposit settlement. Additional charges beyond the held deposit remain due. Never use a reversal to represent an actual refund; it corrects an erroneous record and does not move money.

Live analytics contain only `is_demo=0` transactions and report collected rental earnings separately from deposit liabilities and damage recoveries. They are not profit-after-expenses or tax accounts. Sample clients and earnings are generated only by the local seed script. Financial history remains append-only; corrective entries preserve original records.

The business email and existing verified Site owner are application administrators through the server configuration. The Site audience itself has not been widened. Public launch, new viewers, or a real custom domain require the owner's explicit request. See the root deployment guide and `.env.example` for configuration. Primary sign-in is platform-managed; application registration additionally requires a Turnstile challenge and emergency contacts. The app does not provide a local Argon2/bcrypt password login.

Saved account profiles are separate from booking KYC files and are not deleted by the seven-day booking purge. Finalize account, financial receipt, contract-file, backup, and audit retention before customer launch. Legal warnings retain lawful recovery/referral language; no automatic determination of a specific criminal offense is made by the website.

## Security upgrade operations

- Required files: two distinct government IDs, company/school ID, latest billing proof in the renter's or household member's name, and a selfie holding a valid ID. Review the household relationship and document validity manually; the software cannot establish authenticity from a filename or hash.
- The KYC approval dialog requires both document-review and live-video acknowledgements. Refresh after any file or personal-detail change. Replacing a document on an unsigned reservation resets review and releases the physical-unit hold. Do not promise that released unit remains available.
- Older uploads lack scan/hash review metadata and cannot count toward new approval. Use the audited private replacement flow; do not bulk-mark legacy files clean.
- Unverified booking attempts: 3/rolling hour per account and IP. Verified accounts: 10. All KYC and receipt file attempts share 10/rolling hour. Invalid attempts consume capacity once admitted; CAPTCHA failure does not refund quota. Accounts on one shared network can exhaust the shared IP quota.
- Configure Turnstile for actions `registration`, `booking`, `verification`, `upload` and `receipt` on the actual application hostname. The application checks action and hostname as well as challenge success. Missing credentials keep registration/booking closed; KYC remains off until both Turnstile and a private authenticated malware scanner are configured.
- The rental agreement retains the requested anti-pawning prohibition, but does not automatically declare camera non-return to be carnapping or a proven offense. [RA 10883](https://lawphil.net/statutes/repacts/ra2016/ra_10883_2016.html) defines carnapping around motor vehicles. Authorities determine the applicable classification. Identity evidence remains private; consent is specific under the [NPC consent guidelines](https://privacy.gov.ph/wp-content/uploads/2023/11/NPC-Circular-No.-2023-04_Guidelines-on-Consent_07Nov2023.pdf).
- Creating the owner's Cloudflare account does not migrate managed Sites data or activate uploads. Follow [VERCEL_MIGRATION_PLAN.md](VERCEL_MIGRATION_PLAN.md) for the separate runtime, identity and data migration.
