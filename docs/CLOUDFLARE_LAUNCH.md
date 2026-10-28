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

Configured on 2026-10-28 in the business-owned Google Cloud project `hiramshot-camera-rentals`. Its web client credentials are Worker secrets, and real business-account sign-in succeeded. The app requests only OpenID/email/profile. Google's [basic identity exception](https://support.google.com/cloud/answer/15549945?hl=en) means the Google test-user list is not an access-control boundary for these scopes. The application's own private review gate and private administrator allowlist enforce access. No Google Cloud paid trial or billing upgrade was activated.

Create a Google Cloud OAuth client of type **Web application** for HiramShot. Use only the provider's default OpenID/email/profile scopes, not Gmail access.

- Authorized JavaScript origin: `https://hiramshot.com`
- Authorized redirect URI: `https://hiramshot.com/api/auth/callback/google`
- Keep the current basic identity scopes. Additional scopes change Google's testing/verification requirements and require a separate review.
- Configure `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` through the Worker's Variables and Secrets settings. Do not paste the secret into chat or commit it.
- `AUTH_SECRET` is a separate application session key, initialized by the secure bootstrap helper. It is not the Google client secret.

The `www` host redirects to the canonical root. Begin and complete authentication on the canonical host so cookies and the registered callback match.

The API routes pass the original web Request directly to Auth.js Core with the same configuration used by NextAuth's session/server-action helpers. This avoids the current Vinext NextRequest URL-copy incompatibility, which discarded cookies and POST data when `AUTH_URL` was set. Keep the canonical Worker/proxy checks and all OAuth/CSRF checks enabled. The Worker also serves Vinext's generated `/_next/static/` CSS and browser modules through the static asset binding, with the same security headers as other responses.

## Private review

`REVIEW_MODE=true` admits application pages/APIs only for an authenticated, allowlisted principal. The three owner-approved administrator emails are stored in the private `ADMIN_ACCESS_EMAILS` Worker secret, outside source control. Contact emails, legacy identity-ID settings and stale database roles do not grant administrator access. The server checks the allowlist on every privileged request, as well as active profile, role and MFA. Sign-in/recovery endpoints and static assets remain accessible. Forged identity headers do not satisfy the gate. Review mode fails closed if session protection is missing; password sessions additionally require a current credential version.

Owners can now enter the private review site through Google sign-in. Administrator MFA and role checks separately protect customer documents and administrative operations after sign-in. Keep `PUBLIC_INDEXING_ENABLED=false` during review.

## Booking and document intake

Create a Cloudflare Turnstile Managed widget for `hiramshot.com`. Store `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in Worker settings. Backend actions are `registration`, `booking`, `verification`, `upload` and `receipt`; each token must match its action and the hostname.

Completed on 2026-10-28 with owner approval: **HiramShot website**, Managed mode, hiramshot.com, pre-clearance disabled. Both keys are Worker secrets. Additional prepared actions are `login`, `password_email`, `password_complete`, `review` and `review_upload`. Creating the widget does not enable KYC or bypass missing private scanning.

Email/password setup and its disabled activation switches are documented in [EMAIL_SIGN_IN.md](EMAIL_SIGN_IN.md). Payment gateway preparation is in [PAYMENTS_SETUP.md](PAYMENTS_SETUP.md); online collection is not enabled without a merchant account and integration acceptance. Reviews, ratings and real-rental ranking are described in [REVIEWS.md](REVIEWS.md).

Keep `KYC_ENABLED=false` until a private authenticated HTTPS malware scanner is configured and tested. The scanner must return `{"clean":true}` only after a successful scan. Store its URL/token as `MALWARE_SCANNER_URL` and `MALWARE_SCANNER_TOKEN`. Real IDs and billing documents stay in private R2, with metadata and encrypted personal fields in D1. Never use public multi-user malware submission services for these files.

The native Cloudflare upload limit remains 5 MB. The optional Vercel adapter advertises 4 MB to remain below that platform's request-body limit. All five distinct clean file kinds, administrator review, live physical-ID verification, emergency contact separation and first-rental pickup/meetup rules remain mandatory.

## Retention and release

The native Worker has an hourly Cron Trigger. It calls the retention function directly; no additional public maintenance ingress is introduced. Eligible verification files are due seven calendar days after clearance, and an hourly schedule can delete them within the next hourly run. Verify a synthetic eligible record and object before describing unattended deletion as proven operational. Account profiles, receipts and contract/financial retention remain separate policies.

The current staging configuration does not upgrade billing automatically. Cloudflare Workers Free has CPU limits that may be too small for PDF generation; verify paid-plan suitability and a spend limit before the business launch. Workers Paid starts at US$5/month plus additional applicable usage; R2 and D1 retain their own usage allowances and charges.

Before opening customer intake, complete Google login, owner MFA, Turnstile, private scan, upload/review, payment confirmation, exact-time reservation, contract, turnover, return/refund and scheduled-purge acceptance checks. Then deliberately set `REVIEW_MODE=false` for the public launch. Preserve noindex on account/admin/API routes even when the storefront becomes public.
