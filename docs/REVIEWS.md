# Renter reviews, ratings and Top picks

Clients use the **Reviews** tab in their portal. Only non-demo bookings with a cleared return qualify, and each gear item may receive one review per booking. A client chooses a public display name, 1–5 stars and review text, and explicitly consents to publishing the submitted content after moderation. Edits reset publication to pending. Withdrawal immediately hides public access and removes publication consent; an administrator cannot republish that withdrawn version.

The administrator **Reviews** tab requires the private three-email allowlist, an active admin profile and MFA. The moderator checks text, media and publication consent, then publishes, hides or returns a review for changes. Version checks reject stale moderation. Database triggers enforce cleared-rental ownership, rating/consent validity, unique booking/gear reviews, immutable review ownership, moderation requirements and media limits. No synthetic review or rating is inserted into live data.

The storefront shows published reviews and their star ratings. **Top picks** counts distinct real bookings for gear already handed over or returned (`out`, `cleared`, `returned`), excluding pending/cancelled requests and demo data. Empty states are honest; no fabricated rental counts or five-star testimonials are displayed.

## Photo and video readiness

The upload UI and backend accept up to four JPG/PNG/WebP photos or short MP4 clips per pending review, at most 5 MB each. Attempts share the existing 10-file account/IP rolling-hour quota, and require the `review_upload` Turnstile action. Text reviews use their own quota and `review` challenge. Files are never accepted as KYC documents and cannot point the public media route into the KYC namespace.

Media is **disabled** until `REVIEW_MEDIA_ENABLED=true`, a private `REVIEW_MEDIA_PROCESSOR_URL` and `REVIEW_MEDIA_PROCESSOR_TOKEN` are configured, and acceptance checks pass. Do not enable it using a public multi-user malware submission service.

The processor must accept authenticated raw bytes, fully decode and re-encode supported media, remove private metadata, validate file safety and return sanitized bytes with the correct Content-Type and `x-hiramshot-clean: true`. It must reject malformed/decompression-bomb media, avoid retaining uploads unnecessarily and operate under approved data-processing terms. This header alone is not independent evidence of scanning; the owner must verify the processor before enabling intake. The app additionally validates file signatures, strips image metadata, bounds the processed response and stores a SHA-256 digest.

Objects remain in private R2 under `review-media/`. Only clean, consenting, published review media is served publicly; pending content requires its authenticated owner or an MFA administrator. Video byte-range requests are supported. Finalize separate review-media/moderation retention and withdrawal cleanup procedures before enabling media or customer launch; the seven-day booking KYC purge does not govern marketing/review content.
