# GCash and QR Ph gateway preparation

The owner has no merchant account yet and asked to prepare the setup. Live online collection is **not enabled**. No recipient QR, bank account or payment success has been invented. The booking submission security challenge is separate from payment processing.

Use PayMongo Hosted Checkout for GCash and dynamic QR Ph, which participating InstaPay bank/e-wallet apps can scan. The current provider documentation uses `POST /v2/checkout_sessions`. See the [quick start](https://docs.paymongo.com/docs/payment-channels-hosted-checkout-quick-start), [QR Ph guide](https://docs.paymongo.com/docs/payment-acceptance-qr-ph) and [webhook verification](https://docs.paymongo.com/docs/developer-tools-webhook-setup-management).

## Prepared server adapter

`lib/paymongo.ts` builds a minimal checkout request in PHP centavos, validates hosted redirects, checks raw-body HMAC signatures with a five-minute timestamp tolerance, and validates paid events against a stored session, reference, exact gross amount, currency, successful payment intent, environment and payment channel. It never treats the success redirect as payment evidence. There is deliberately no public payment-creation or financial-posting endpoint yet.

## Owner setup

1. Create a business-owned merchant account, complete the provider's verification, and review its transaction fees and settlement terms. No paid subscription or merchant agreement has been accepted by the agent.
2. Enable GCash and QR Ph through the merchant dashboard. Use test credentials first; live payment methods require provider approval.
3. Store `PAYMONGO_SECRET_KEY` and the separate `PAYMONGO_WEBHOOK_SECRET` as Worker secrets. Keep `PAYMENT_GATEWAY_ENABLED=false`. Do not paste keys into chat or GitHub.
4. Complete the checkout/session persistence and webhook reconciliation wiring using the prepared adapter. The creation route must authenticate the booking owner, enforce completed KYC/video approval and an active account, derive the outstanding reservation amount from the ledger, preserve a unique checkout reference, and prevent a second session after an uncertain provider response.
5. The signed webhook must validate a stored checkout and provider payment before writing an idempotent financial operation. Provider fees are expenses, not a reduction to the client's gross payment. Test duplicate/replayed events, amount/mode mismatches, cancellation, timeouts, and successful payment with no browser return. Reconciliation is required for missed notifications and late/changed bookings.
6. Reservation confirmation must still check identity review, physical-unit availability and agreed handover terms. A payment notification alone cannot confirm or release equipment. Refunds remain a separate authorized operation.
7. After test acceptance and owner authorization of live collection, enable the payment route and show the hosted checkout button for eligible bookings. Keep public payment routes off until these checks pass.

Do not create a QR using an assumed GCash number. If a static business QR is used temporarily, it requires manual receipt verification and must not be presented as automatic payment confirmation.
