# HiramShot verification record

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
