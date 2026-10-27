# HiramShot native Cloudflare launch

The owner chose Cloudflare Workers hosting instead of Vercel after the account was confirmed to use Vercel Hobby. The business domain `hiramshot.com` is registered in the owner's Cloudflare account. No paid Vercel upgrade was activated; its newly created HiramShot Git integration was disconnected.

## Resources

- Database: `hiramshot-rentals`, Cloudflare D1, Asia-Pacific location hint.
- Private bucket: `hiramshot-private`, Cloudflare R2, public `r2.dev` access disabled.
- Application: `hiramshot-camera-rentals`, a native Cloudflare Worker with D1, R2 and static asset bindings.
- Identity: Google OpenID Connect through Auth.js, verified email required. No incoming Sites identity header establishes a user on this host.
- Internal account UUIDs, booking quote snapshots, KYC guards, audit and ledger constraints remain in the existing schema. New owner bootstrap profiles contain no password and can only be claimed by the matching verified identity. Existing linked identities are never silently merged into another provider subject.

All six current SQL migrations were applied to the new database. The real D1 HTTP transaction and account/IP quota probes passed using temporary synthetic records, which were removed. No real customer identity files were moved from the old review deployment. The original Sites deployment remains a separate recovery snapshot.

## Build and deploy

Run `npm test`, `npm run test:components`, `npx tsc --noEmit`, and the SQLite checks under `tests/` when changing business/security behavior. Build with `npm run build:cloudflare`. Confirm the generated Worker references the native D1/R2 bindings before `npm run deploy:cloudflare`.

The application Worker retains CSP, HSTS on HTTPS, same-origin mutation checks, no-store private responses, noindex rules and framing protection. Its proxy strips untrusted identity/IP headers; the entrypoint captures Cloudflare's trusted edge IP in request-scoped storage first. Concurrent requests cannot share that context. No whole-proxy bypass is used.

## Google sign-in setup

Create a Google Cloud OAuth client of type **Web application** for HiramShot. Use only the provider's default OpenID/email/profile scopes, not Gmail access.

- Authorized JavaScript origin: `https://hiramshot.com`
- Authorized redirect URI: `https://hiramshot.com/api/auth/callback/google`
- If the OAuth app is in Testing mode, add the two configured owner email addresses as test users.
- Configure `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` through the Worker's Variables and Secrets settings. Do not paste the secret into chat or commit it.
- `AUTH_SECRET` is a separate application session key, initialized by the secure bootstrap helper. It is not the Google client secret.

The `www` host redirects to the canonical root. Begin and complete authentication on the canonical host so cookies and the registered callback match.

## Private review

`REVIEW_MODE=true` admits application pages/APIs only for an authenticated Google principal whose email is in the configured administrator allowlist. Sign-in endpoints and static assets remain accessible. Forged identity headers do not satisfy this gate. Review mode fails closed if the session secret is missing.

Google setup is required before owners can enter the new private review site. This is separate from administrator MFA and role checks, which still protect customer documents and administrative operations after sign-in. Keep `PUBLIC_INDEXING_ENABLED=false` during review.

## Booking and document intake

Create a Cloudflare Turnstile Managed widget for `hiramshot.com`. Store `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in Worker settings. Backend actions are `registration`, `booking`, `verification`, `upload` and `receipt`; each token must match its action and the hostname.

Keep `KYC_ENABLED=false` until a private authenticated HTTPS malware scanner is configured and tested. The scanner must return `{"clean":true}` only after a successful scan. Store its URL/token as `MALWARE_SCANNER_URL` and `MALWARE_SCANNER_TOKEN`. Real IDs and billing documents stay in private R2, with metadata and encrypted personal fields in D1. Never use public multi-user malware submission services for these files.

The native Cloudflare upload limit remains 5 MB. The optional Vercel adapter advertises 4 MB to remain below that platform's request-body limit. All five distinct clean file kinds, administrator review, live physical-ID verification, emergency contact separation and first-rental pickup/meetup rules remain mandatory.

## Retention and release

The native Worker has an hourly Cron Trigger. It calls the retention function directly; no additional public maintenance ingress is introduced. Eligible verification files are due seven calendar days after clearance, and an hourly schedule can delete them within the next hourly run. Verify a synthetic eligible record and object before describing unattended deletion as proven operational. Account profiles, receipts and contract/financial retention remain separate policies.

The current staging configuration does not upgrade billing automatically. Cloudflare Workers Free has CPU limits that may be too small for PDF generation; verify paid-plan suitability and a spend limit before the business launch. Workers Paid starts at US$5/month plus additional applicable usage; R2 and D1 retain their own usage allowances and charges.

Before opening customer intake, complete Google login, owner MFA, Turnstile, private scan, upload/review, payment confirmation, exact-time reservation, contract, turnover, return/refund and scheduled-purge acceptance checks. Then deliberately set `REVIEW_MODE=false` for the public launch. Preserve noindex on account/admin/API routes even when the storefront becomes public.
