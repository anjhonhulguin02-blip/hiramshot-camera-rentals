# Production configuration and launch checklist

Configured through Sites: random 32-byte DATA_ENCRYPTION_KEY (base64), ADMIN_SESSION_SECRET, AUDIT_HMAC_KEY, DOWNLOAD_SECRET, PURGE_SECRET. Values are secrets and are not written to the source repository. ADMIN_EMAIL and CONTACT_EMAIL are hiramshotrentals@gmail.com. KYC_RETENTION_DAYS is seven; the application currently enforces seven days directly. The site remains owner-private.

Before customer launch:
1. Configure a real TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY for the deployed hostname. Booking submission fails closed until these are present. Tokens are validated server-side, single-use, hostname/action-bound, and expire per Cloudflare policy.
2. Configure HTTPS MALWARE_SCANNER_URL and MALWARE_SCANNER_TOKEN. The private scanner must accept a raw octet-stream POST with bearer authorization and return JSON {"clean":true} only after validated decoding and malware/content checks. A failed or unavailable scanner rejects the upload. Scanner content retention and data-processing terms require owner approval.
3. Sign in with the configured owner account, enroll an authenticator through /admin, and initialize physical inventory. Additional site-specific user IDs may be configured through ADMIN_USER_IDS. The platform owner may configure these settings; customer accounts cannot grant themselves access.
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
