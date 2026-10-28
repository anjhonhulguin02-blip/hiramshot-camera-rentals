# HiramShot Camera Rentals

A camera and drone rental platform with the original HiramShot logo, equipment photos and kit videos. The owner selected native Cloudflare Workers hosting with D1, private R2 storage, and Google sign-in. The registered business domain is `hiramshot.com`.

The site is configured for private owner review. Google sign-in and Turnstile are configured; customer document intake still requires private malware scanning and acceptance checks. See [Cloudflare launch setup](docs/CLOUDFLARE_LAUNCH.md) for the current configuration and release checks.

## Main features

- Responsive catalog with compact price dialogs and exact 1–2, 3–6 and 7+ day rates.
- Private client profiles, booking progress, KYC submission, electronic agreements and payment history.
- Five mandatory clean document kinds, live physical-ID/video review, emergency contacts and pickup/meetup restrictions.
- Administrator/staff roles, operator MFA, audit logs, inventory and exact-time physical-unit reservations.
- An append-only financial ledger separating rental income from refundable deposit liabilities.
- Private file downloads, encrypted personal details, action-bound Turnstile checks and atomic account/IP quotas.
- Hourly retention handler for verification data due seven calendar days after return clearance.
- Verified-rental reviews, 1–5 star ratings, administrator moderation and Top picks based on real rentals. Photo/video intake requires a private media processor.
- Email/password, show/hide password and recovery screens, with secure email delivery prepared but disabled until configured. Google remains available.

## Current runtime

| Service | Implementation |
| --- | --- |
| Application | Vinext / React, native Cloudflare Worker |
| Database | Cloudflare D1 / SQLite; Drizzle schema and versioned SQL migrations |
| Files | Private Cloudflare R2 bucket; native Worker binding |
| Client identity | Verified Google OpenID Connect session through Auth.js |
| Operator authentication | Private three-email allowlist, verified session and application TOTP MFA |
| Domain | Cloudflare Registrar and Cloudflare DNS |

Supabase and MongoDB are not in use. The old Sites-managed private review deployment remains a separate recovery snapshot. Its `.openai/hosting.json` is retained for that legacy deployment and is not the current Cloudflare deployment target.

## Development and deployment

Use Node.js 22.13 or later. Install with `npm ci`; authenticate the Cloudflare CLI with `node node_modules/wrangler/bin/wrangler.js login`.

```sh
npm run dev
npm test
npm run test:components
npx tsc --noEmit
npm run build:cloudflare
npm run deploy:cloudflare
```

The native configuration is `vite.cloudflare.config.ts` and `cloudflare/wrangler.app.jsonc`. The build emits `dist/server/wrangler.json`; deployment uses that generated artifact. Private R2, Google sessions, the full security proxy and request-scoped edge-IP capture are required parts of this runtime.

Apply pending migrations with Wrangler D1 migrations against the explicit application config. Never rewrite applied SQL history. The three approved administrator emails are held in the private `ADMIN_ACCESS_EMAILS` Worker secret and bootstrapped as administrator profiles. A verified identity is required to claim a profile; client requests cannot choose a role. Never put the real private allowlist in tracked configuration or documentation.

Configure real keys through Worker Variables and Secrets. `.env.example` lists names only. Never commit real secrets, local state, private documents, or deployment archives. `scripts/bootstrap-cloudflare-secrets.mjs` generates only missing internal keys and preserves existing ones. Do not rotate the data-encryption key without a tested data migration.

## Verification and launch

Pricing, upload validation, consent, review/version guards, financial arithmetic, atomic quotas, identity validation, private review and concurrent request isolation have automated checks. A real D1 HTTP rollback and quota probe was also run against the new database using temporary synthetic records.

Google sign-in was verified on the deployed domain. Private malware scanning, email delivery, merchant payments, owner MFA enrollment, the full customer/admin rental lifecycle and a synthetic unattended retention run still require configured-service acceptance checks. Passing unit tests does not establish independent security certification. No real identity documents are used in tests.

Setup references: [email sign-in](docs/EMAIL_SIGN_IN.md), [payment gateway preparation](docs/PAYMENTS_SETUP.md), and [reviews and media](docs/REVIEWS.md). No live merchant payment endpoint is enabled.

Further references: [operations](docs/OPERATIONS.md), [architecture](docs/ARCHITECTURE.md), [verification record](docs/VERIFICATION.md), [Cloudflare launch](docs/CLOUDFLARE_LAUNCH.md). The [Vercel migration plan](docs/VERCEL_MIGRATION_PLAN.md) records the earlier option; the owner chose Cloudflare hosting after confirming Vercel Hobby's non-commercial restriction.
