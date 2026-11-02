# Original storefront restored — November 2, 2026

The owner cancelled the Halloween theme and promotion. This supersedes the former November 3 cutoff. The original cinematic home page, original business logo, actual gear photos, scroll animation, regular price dialogs and regular new-booking calculator are restored. Saved booking/contract prices are not rewritten.

Application source: `9d09132`. Native Cloudflare deployment: `c612b60a-b2e4-48cb-96d8-b8e88989d8d3`, serving `hiramshot.com` and `www.hiramshot.com`. Deployed from the isolated release checkout, excluding the separate uncommitted QA/security audit changes and migration 0011.

## Verification

- 67 unit/integration tests, 20 component checks and one real-route booking-pricing test passed; TypeScript and the native Cloudflare build passed.
- Booking API test proves the former promo dates now use regular prices, a forged discount is ignored, a stale promo total gets a review/refresh error, and idempotent replay does not create a duplicate booking or owner notification.
- Live HTTP checks passed for security headers, private API authentication, sign-in/recovery pages, 16 referenced CSS/JavaScript assets, intake readiness and OAuth CSRF/PKCE/nonce checks. No real booking, payment, account approval or document upload was created for these checks.
- Live browser confirmed the original hero and no Halloween text. X5 dialog: 650 / 550 / 450 pesos per day, refundable deposit 1,000 pesos. Home also shows X6 800/day and 1,500 deposit, Neo Standard 500/day and 800 deposit, Neo Fly More 700/day and 800 deposit at the initial tier. Phone-width rendering had no horizontal overflow; an actual iPhone/Safari session was not available for this verification. Temporary viewport override was reset.
- Screenshot: local ignored `outputs/original-design-restored.png`. The user's existing booking form was not reloaded or edited.

## Owner email alerts retained

Migration 0012 and the five-minute retry schedule remain active independently of the cancelled campaign. Destination: `hiramshotcamerarentals@gmail.com`; sender: existing `accounts@hiramshot.com` email binding. New client registrations, rental requests and complete clean KYC submissions queue owner notifications. Email carries a protected admin link and minimal record details, with no identity-document attachments or private file URLs.

The previously queued, clearly labelled setup TEST message reached `SENT`, with one attempt and no recorded send error. This means the email service returned an accepted message ID; it does not prove Gmail inbox placement. No additional test message was sent during the rollback.

Hourly KYC deletion schedule, private malware scanning, admin allowlist/MFA and email/password/Google sign-in configuration remain in place. No new provider, subscription, billing upgrade or access grant was introduced by this rollback.
