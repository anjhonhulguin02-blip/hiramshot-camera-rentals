# Owner Gmail notifications

Destination selected by the owner: `hiramshotcamerarentals@gmail.com`. Sender: the existing verified `accounts@hiramshot.com` Cloudflare Email Service binding. No new email subscription or third-party document processor is added.

Migration 0012 writes a durable notification in the same database transaction as:

- A new non-demo CLIENT registration.
- A new non-demo rental request.
- Completion of all five clean requirements for booking or pre-booking account identity review.

The delivery job rechecks current eligibility, the distinct government-ID pair, active account, expiry and booking/case status before sending. Cancelled/expired/removed requirements do not generate a stale approval alert. File receipt is not called identity approval. Existing records are not backfilled, so activation does not email historical clients or resend all past requests.

Only the configured owner recipient is used. The message contains the client-supplied display name, internal/reference code, booking dates where applicable and a fixed-origin admin link. There are no ID/bill/selfie attachments, ID numbers, addresses, emergency contacts, passwords, recovery tokens or private document links. Opening the linked record still requires the existing admin allowlist and authenticator verification. The email cannot approve an account or confirm a reservation.

## Reliability and controls

Successful relevant API mutations wake the delivery job through `ctx.waitUntil`, keeping email failure separate from the customer response. A five-minute Cron Trigger retries pending messages; the original hourly KYC purge schedule remains separate. Scheduled propagation/provider interruptions can delay delivery. No inbox-delivery guarantee is implied by provider acceptance.

Database event keys deduplicate repeated writes and booking replays. Only one dispatcher claims the queue at a time. Pending retakes are coalesced and review alerts for the same case have a fifteen-minute cooldown. Sends are limited to three attempts per invocation and 100 total attempts per day by default. Failures back off, with eight attempts and a 24-hour age limit. Expired in-flight leases recover after interruptions. Permanent/exhausted failures remain `FAILED` for operational review. Delivery is at least once: a provider acceptance followed by an interrupted state write can cause a duplicate on retry.

The queue stores event references/status, attempts, timestamps and provider message IDs, not copies of document bytes or email bodies. Successful/skipped metadata is removed after 30 days. Failed items must be reviewed and cleared under the business's audit policy. The recipient's Gmail retains received mail under its own settings; KYC deletion does not recall delivered emails.

Configuration is server-owned: `ADMIN_NOTIFICATIONS_ENABLED`, `ADMIN_NOTIFICATION_EMAIL`, `ADMIN_NOTIFICATION_DAILY_LIMIT`. The authenticated customer cannot choose a recipient, sender, notification body or arbitrary dashboard URL. Mail credentials stay in the existing private binding. See [Cloudflare's binding API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/) for its acceptance response.

Operational checks: query `owner_notifications` for pending/retry/failed items and `owner_notification_dispatch` for the current attempt budget. Review Cloudflare Email Service activity for delivered/bounced/suppressed outcomes; `SENT` here means an accepted `messageId`, not confirmed Gmail inbox placement. Do not bypass suppression to force delivery. A `TEST` event is reserved for an operator's setup canary and does not create a customer/booking or approve identity.
