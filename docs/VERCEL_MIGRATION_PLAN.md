# Vercel migration plan (superseded hosting choice)

Status: superseded on 2026-10-27. The owner selected native Cloudflare Workers hosting with D1/R2 and Google sign-in after the Vercel account was confirmed to use Hobby. A Vercel-compatible build was tested, but no Vercel deployment or paid upgrade was performed. See [CLOUDFLARE_LAUNCH.md](CLOUDFLARE_LAUNCH.md). Historical plan follows.

Original status: preparation only. The current private review website remains on Sites / Cloudflare Workers. Creating a personal Cloudflare account does not transfer the existing managed database or bucket into that account. No Vercel deployment or Supabase migration has been performed.

## Current services

| Purpose | Current implementation |
| --- | --- |
| Application runtime | Vinext / React on a Sites-managed Cloudflare Worker |
| Database | Cloudflare D1, SQLite SQL, Drizzle schema and versioned migrations |
| Private files | Cloudflare R2 binding; identity documents, payment receipts and signed agreements |
| Primary identity | Sites-managed sign-in and trusted identity headers |
| Operator authentication | Primary identity plus application TOTP MFA |
| Abuse protection | D1 rolling request limits; server-verified Cloudflare Turnstile |
| Private document intake | Disabled until private malware scanning and Turnstile are configured |

This repository is not directly deployable as a standard Vercel Next.js app. Its build produces a Worker artifact, imports `cloudflare:workers`, and depends on runtime D1/R2 bindings. Selecting the Next.js preset alone does not provide these services.

## Choose a target before moving data

The next implementation phase must select one of these architectures with the owner:

1. **Keep Cloudflare storage.** Create owner-controlled D1/R2 resources. Move backend operations behind an authenticated Worker service, or implement carefully scoped D1 HTTP and R2 S3 adapters in server-only code. Never expose Cloudflare account API tokens, R2 credentials or private file keys to browsers. Keep transactional booking and rate-limit operations together in their database service.
2. **Migrate database and identity to Postgres / Supabase.** Port the SQL, foreign keys, overlap checks, append-only audit and ledger constraints, KYC guards and atomic request quotas. Adopt a verified authentication provider and enforce server authorization and, where used, row-level security. The current Drizzle SQLite schema and triggers cannot simply run as Postgres migrations. Decide separately whether private files stay in R2 or move to private Supabase Storage.

Neither option is selected or provisioned by this plan. D1 is the current database; neither MongoDB nor Supabase is currently in use.

## Implementation order

1. Create an isolated migration branch and a staging environment. Replace the Vinext Worker build with a supported Next.js production build and server adapters, or explicitly retain a separate Worker API. Preserve the existing logo, responsive UI, exact rate tiers and historical quote snapshots.
2. Replace Sites sign-in with a Vercel-compatible identity provider. Direct requests to Vercel must never trust client-supplied `oai-authenticated-user-*` headers. Verify sessions server-side. Preserve internal client UUIDs and map verified provider subjects explicitly; never merge accounts using an unverified email. Re-enroll operator MFA if the identity/session binding changes.
3. Port storage, security and atomic operations. Preserve the five-document approval gate, video-review acknowledgement, KYC version check, emergency-contact validation, courier restrictions, payment-version checks, exact-time unit locks, and account/IP rolling quotas. If a Worker API is retained, authenticate the service connection and bind each request to a verified client identity and role.
4. Add Vercel runtime secrets through its secure settings. Preserve the existing data-encryption key securely for decryption, or perform a tested re-encryption migration. Keep API secrets server-only; no secret belongs in `NEXT_PUBLIC_*`, GitHub, screenshots or this document. Rotate signing/session secrets deliberately with a session invalidation plan.
5. Register the staging and final `vercel.app` hostnames in Turnstile. Configure a private authenticated malware scanner and private bucket access. Tokens remain action- and hostname-bound; registration, booking and uploads must fail closed without valid server verification. Keep KYC intake off until synthetic acceptance checks succeed.
6. Reimplement Worker headers and canonical routing in Vercel middleware/configuration: CSP, frame policy, HSTS on HTTPS, no-store for private data, secure operator cookies, same-origin write checks, and noindex for private previews. Protect staging access at the hosting layer as well as in application routes.
7. Export a consistent database snapshot and private objects using authorized provider tools. Encrypt transfer files and keep them outside source control. Import parent records before children; verify row counts, file hashes, agreement PDF hashes, unit allocations and ledger balances. Preserve historical signed PDF bytes; do not regenerate already signed contracts under new terms.
8. Implement and verify an authenticated scheduled retention job. Delete eligible KYC objects and sensitive booking fields seven calendar days after clearance while preserving required transaction history and agreement hashes. The current scheduled-handler implementation has no verified unattended activation. A scheduler must use a supported authenticated path rather than adding a public bypass.
9. Test anonymous access denial, client cross-account isolation, operator MFA and roles, all five missing-document cases, stale approval, first-rental courier denial, invalid/reused CAPTCHA, upload quota concurrency, payments, overlapping bookings, contract signing and retention. Use synthetic identities and files. Verify backup restore and rollback before production cutover.
10. Freeze writes briefly for the final delta import, switch the application URL to the approved `vercel.app` deployment and run acceptance checks. Retain the old service for rollback without letting both versions accept independent booking writes. Bind a custom domain only after the Vercel deployment works and the owner supplies a domain.

## Release evidence

Record the deployment ID, source commit, schema version, authenticated smoke-test results, backup location, restore result and retention-run receipt. Updating this document is not evidence that migration or deployment has occurred.

References: [Vercel Next.js deployment](https://vercel.com/docs/frameworks/full-stack/nextjs), [D1 Worker API](https://developers.cloudflare.com/d1/worker-api/), [R2 S3 API](https://developers.cloudflare.com/r2/api/s3/api/), [Turnstile server verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
