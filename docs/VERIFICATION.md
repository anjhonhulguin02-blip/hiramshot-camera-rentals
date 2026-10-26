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

