# HiramShot verification record

## White browser icon and authenticator QR — 2026-10-28

- Browser metadata now uses a versioned white HiramShot monogram with the original orange accent on a dark badge, preserving the original logo silhouette. SVG, 32-pixel PNG and 180-pixel touch icon are served under the public asset namespace. Live responses, MIME types, dimensions and login icon metadata passed. Header/footer brand assets are preserved.
- MFA enrollment renders its existing provisioned `otpauth://` URI locally as an SVG QR with a four-module quiet zone. The manual setup key remains available in a disclosure. No QR provider, remote QR image, local storage or new credential endpoint is used. Pending secret/URI state is cleared after successful confirmation; existing backend owner checks, expiry, encrypted storage and six-digit confirmation remain in force.
- Eleven component checks passed, including independently decoding rendered QR images for synthetic short and long account labels back to the exact provisioned URI and rejecting mismatched settings. TypeScript, native build and production dependency audit passed (zero reported production advisories at check time). Deployed HTTPS/OAuth/security checks also passed.
- Desktop and 375-pixel phone previews used only the public RFC test key and had no horizontal overflow. No real administrator MFA was enrolled, reset, scanned or confirmed by the agent. Owners must reload the admin page, begin their own enrollment and scan their private QR; enabled authenticators remain enrolled.
- Implementation references: [QR encoder API](https://github.com/kazuhikoarase/qrcode-generator/blob/master/js/README.md), [Google Authenticator key URI format](https://github.com/google/google-authenticator/wiki/Key-Uri-Format).

## Login, verified reviews and private operator access — 2026-10-28

This is the current native deployment record; earlier sections retain historical setup states.

- Deployed to hiramshot.com and www.hiramshot.com. Final Worker version: `791aeb29-0071-4364-86b8-5d8309e6fc84`. Native metadata confirmed private `ADMIN_ACCESS_EMAILS` secret binding, preserved provider/crypto secrets, D1/R2/assets bindings, disabled workers.dev/preview URLs and the hourly schedule. The older plain `ADMIN_EMAILS` binding was removed. No real private operator list is published in source.
- D1 readback confirmed migrations 0000–0007, three active administrator profiles and zero reviews. Every privileged request checks the configured allowlist as well as active role and MFA. A business Google session reached the admin authenticator gate; MFA enrollment/unlock and moderation actions require owner testing.
- The managed Turnstile widget is configured for hiramshot.com with pre-clearance off. Keys are Worker secrets. The booking page completed its loading state and reported a successful automatic security check; no CAPTCHA was manually solved and no synthetic booking was submitted to production. Registration, booking and upload validation retain action/hostname and rolling account/IP limits.
- Email/password, show/hide, account creation, email verification and password recovery screens are deployed. Email delivery and password login remain disabled until Resend/domain setup and a production hashing acceptance check. Local native workerd verified a synthetic scrypt round trip; its timing is not a production CPU budget measurement. No real password was entered or changed and no verification email was sent.
- Verified-rental 1–5 ratings, client review editing/withdrawal, MFA moderation and real-rental Top picks are deployed. Reviews require a cleared, non-demo matching rental; edits and new media invalidate stale moderation. Publication requires consent and a privacy review. Production empty states remain honest. Photo/video intake stays disabled without the private decode/re-encode/metadata-removal/scanning service.
- PayMongo hosted-checkout request, response and webhook verification helpers are prepared and tested. No public payment creation/posting route, merchant keys, live QR collection or automatic ledger reconciliation is activated. Remaining integration requirements are in PAYMENTS_SETUP.md.
- Automated checks: 49 unit/security/business tests and nine rendered-component regressions passed. TypeScript and the native build passed. SQLite financial/lifecycle, KYC, password token/version and review/media suites passed. A targeted six-test authentication suite passed after the final native Request reconstruction fix.
- Final live HTTPS checks passed: private pages/APIs, forged-identity rejection, all 16 referenced login CSS/JavaScript assets, four email recovery/setup routes, disabled email endpoints and cross-origin rejection. Direct OAuth POST passed canonical callback, OpenID/email/profile-only scopes, secure state/PKCE/nonce cookies and invalid-CSRF rejection. The bounded authentication adapter explicitly reconstructs a standard Request after reading its body to avoid framework subclass state errors on workerd.
- Browser checks confirmed real Google business-account login, account loading completion, client Reviews eligibility empty state, admin MFA gate, storefront reviews/Top picks empty states and accessible empty-password show/hide. Desktop and 375-pixel phone login, recovery and storefront checks showed no horizontal overflow. Original logo, photos and rate dialogs remain intact. Landscape re-check was interrupted by a browser debugger timeout; the temporary viewport was reset. A fresh tab recovered and was retained as the deliverable.
- Booking quote verified in-browser: X5 for three days at PHP550/day plus battery and helmet mount totals PHP2,550, downpayment PHP765, due at pickup PHP3,785 including the refundable PHP2,000 deposit. No real payment was attempted.
- Review mode remains enabled; indexing, KYC intake, password auth and review media intake remain disabled. Private scanning, transactional email, merchant account/integration, owner MFA acceptance, complete rental lifecycle and synthetic unattended purge acceptance remain launch conditions. No paid plan was activated.

## Google sign-in and static asset repair — 2026-10-28

- Created the business-owned Google OAuth web client with owner approval of the Google API User Data Policy. The app remains External/Testing with two configured owner test users. Google's basic identity-only scope exception applies to this OpenID/email/profile configuration; the application private review gate separately limits access to the three approved administrators. Client credentials were stored as Worker secrets; the temporary credential file was removed. No secret value was printed or committed.
- Fixed deployed CSS and JavaScript returning 404 by routing generated `/_next/static/` files through the native asset binding. The original logo, photos, compact rate dialogs and existing design are preserved.
- Fixed the Vinext/NextAuth Request-copy incompatibility with `AUTH_URL`: API handlers now call Auth.js Core with the original Request and the shared authentication configuration. Canonical origin enforcement, full proxy, secure cookies, PKCE/S256, state, nonce, verified Google identities and CSRF checks remain enabled.
- Native build, TypeScript noEmit and nine deployment/security checks passed. Live HTTPS checks passed for private page/API protection, denied forged identity headers, the configured provider, all 11 referenced CSS/JavaScript resources, Google-only OpenID/email/profile scopes, secure check cookies, the canonical callback and invalid-CSRF rejection.
- Browser automation recovered. Real Google business-account login successfully returned to the styled homepage at `https://hiramshot.com/`. Original branding and the X5 price dialog were visually checked. Login layouts at small-phone and landscape sizes had no horizontal overflow.
- Review mode remains enabled, indexing disabled and KYC intake disabled. Turnstile, a private scanner, owner MFA enrollment, the complete rental lifecycle and unattended synthetic purge acceptance still require completion before customer launch.

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
