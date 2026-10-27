# HiramShot verification record

## Native Cloudflare launch — 2026-10-27

- The standalone Next.js build was validated during the Vercel investigation. The owner then chose native Cloudflare Workers after confirming Vercel Hobby's non-commercial restriction. No Vercel deployment or paid upgrade was performed; its Git integration was disconnected.
- The native Cloudflare build and Wrangler deployment validation passed. The artifact uses native D1/R2 bindings and Google identity; it does not include the Vercel D1 runtime or trust legacy Sites identity headers. The full application proxy and Worker security headers remain active.
- 35 unit/security/business checks passed across the suite, including nine deployment/review checks. Six rendered UI regressions passed. All SQLite financial, overlap, KYC and stale-review checks passed. TypeScript noEmit passed.
- A real D1 HTTP batch rollback and rolling account/IP quota test passed on the new owner-controlled database. Temporary synthetic probe records were removed.
- R2 public development access is disabled. The two approved owner profiles are unlinked bootstrap records with no password; Google verification is required before claiming them.
- Ten HTTPS checks passed on hiramshot.com: private page redirects, denied unauthenticated account/booking/document requests, denied forged identity headers, disabled unconfigured Google provider, original logo delivery, and CSP/noindex/MIME headers.
- Native metadata confirmed both custom domain routes, disabled workers.dev/preview URLs, native database/bucket/assets bindings, and the hourly Cron Trigger. Missing internal encryption/session/audit/download keys were initialized without printing their values or rotating existing keys.
- Production dependency audit: zero reported vulnerabilities on 2026-10-27.
- Google OAuth credentials, Turnstile, private scanning, a full browser-driven customer/admin lifecycle, and a synthetic unattended purge acceptance check remain pending. The site stays in private review and KYC intake stays disabled. New browser automation was unavailable because the computer-use kernel could not initialize.

Earlier verification history follows.

- TypeScript noEmit: passed.
- Unit/security checks: 11 passed. Coverage includes every exact rate tier and day 6/7 boundaries; combo and add-ons; minimum reservation/deposit-credit arithmetic; invalid catalogs, selections and dates; upload spoofing/size/script checks; metadata removal; signature validation; contract file SHA-256; RFC 6238 TOTP vectors.
- SQLite schema and security checks: passed. Concurrent-overlap attempt rolls back every row in the bundle. Audit UPDATE and DELETE are blocked by append-only triggers.
- Local HTTP checks: 13 routes/cases passed, including anonymous customer/admin/document denial, cross-origin write denial, retired endpoints and disabled unconfigured KYC.
- Production dependency audit after upgrades: zero reported vulnerabilities at check time. This does not establish absence of undisclosed vulnerabilities.
- Browser QA: phone and tablet overflow checks; responsive menu; equipment filter; navigation into the rental calculator; desktop visual review. Browser automation did not provide a reliable full form submission; the live end-to-end customer/admin workflow remains unverified pending production service setup.
- Agreement PDF: generated test-only sample; three pages rendered and visually inspected, including original logo, English terms, signature and hash. No real signature or customer documents used.
- Production build: run through Sites workflow before packaging.

Known incomplete configuration and operational checks are in OPERATIONS.md. Do not present this private build as independently certified, fully production-ready, or as having an active auto-purge schedule.

## Rate display correction

Catalog cards now advertise the standard package's 1–2 day rate before dates are selected. Every package's duration tiers are available in the View prices dialog, including both DJI Neo 2 packages. The three catalog cards remain compact, with only the current daily rate and duration visible. Choosing valid dates changes the card's primary rate and highlights the applicable tier. The booking package selector uses the same rate schedule component, and the quote calculation uses the same tier lookup helper.
Three component-render regression checks verify all default card prices, every package/duration tier, and matching booking amounts. Run: node --experimental-strip-types --import ./tests/render-tsx.mjs --test tests/rate-display.test.mjs.
Live browser automation was unavailable during this correction; rendered component checks and the production build verify the change without a new browser screenshot.


## Account, inventory, finance, and domain upgrade

- 20 unit/security/finance tests passed: exact centavos and allocation, 24-hour/day-6/day-7 boundaries, separate deposit liability, no duplicated forfeiture income, return deductions, minimum-reservation deposit credit, late-fee boundaries, CSV formula escaping, financial PDF generation, and the existing pricing/upload/TOTP/agreement checks.
- Three component regressions passed for compact price dialogs and consistent catalog/booking rates.
- SQLite integration checks passed using actual prepared SQL for booking creation and financial writes: stale-version rejection, duplicate-reference atomic rollback, refund liability, append-only payment/ledger/reversal triggers, exact-time INSERT/UPDATE overlap prevention, back-to-back rentals, default inventory seed, shared physical drone, and exclusion of synthetic revenue.
- 22 local HTTP route cases passed. Additional assertions verified disabled KYC/receipt services and private robots/sitemap behavior. Anonymous account, admin, ledger, user-manager, and receipt access is denied; cross-origin booking mutation is denied.
- Local browser preview: signed in through the supported local development identity; client portal, account status, profile controls, and exact quote rendered. Phone viewport 390 pixels had no horizontal page overflow. New full payment/KYC/signature/turnover browser flow still needs configured services and MFA operator testing before customer launch.
- Financial report: three-page synthetic report rendered and visually checked, including the original logo, columns, continuation headers, and rental-versus-liability totals. No real customer or financial data was used.
- Production dependency advisory check: zero reported production vulnerabilities on 2026-10-26. Independent security review is not replaced by this check.
- Custom-domain DNS, external service credentials, and unattended retention remain unconfigured; the site stays private. The final build/deployment result is supplied by the Sites workflow.

## Anti-fraud upgrade — 2026-10-27

- 26 unit/security/finance tests passed, including normalized Philippine mobile aliases, emergency contact separation, all five clean document kinds, mandatory boolean video-review acknowledgement, and atomic rolling account/IP quotas at the 3-booking and 10-file boundaries.
- Six rendered-component checks passed. They cover all earlier rate displays plus required registration contacts, disabled submission without a challenge, both admin review checkboxes, all five missing-document approval cases, mandatory anti-fraud consent, and pickup/meetup-only choices.
- SQLite integration checks passed against all migrations and actual API prepared SQL. Missing or unreviewed files and missing video review block confirmation; changed file versions block stale approval; duplicate hashes and malformed metadata are rejected. Existing overlap, ledger, immutable-history and quote-snapshot checks also passed.
- 25 anonymous HTTP route cases passed, including registration and the common documents endpoint, plus disabled-service/private-indexing assertions. Three authenticated local checks verified missing Turnstile fails closed for both booking and registration, and an emergency number alias equal to the renter's number is rejected. Only supported local development identity and synthetic profile values were used.
- TypeScript noEmit passed. A three-page synthetic agreement was rendered and visually inspected: original logo, prominent anti-pawning clause, restricted evidence consent, signature and hashes remain legible.
- New browser automation was unavailable because the computer-use kernel could not initialize. Component rendering and HTTP checks do not establish a full browser-driven paid rental lifecycle. Real Turnstile, private scanning, KYC review, payment, signing and unattended purge still need configured-service acceptance checks.
- The Vercel migration document is a plan. No backend provider migration, Vercel deployment, custom-domain binding or change to the owner-private Site audience was performed.
