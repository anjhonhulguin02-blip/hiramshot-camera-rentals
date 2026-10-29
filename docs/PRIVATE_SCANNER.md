# Private antivirus — active on Cloudflare

Updated 2026-10-29. The owner upgraded Workers Paid and authorized the private scanner. `hiramshot-private-scanner` is deployed and bound to the application as `MALWARE_SCANNER`. It has no public route, workers.dev endpoint or preview URL. `KYC_ENABLED=true` was deployed after real-engine acceptance passed.

## Accepted behavior

The deployed private service reported recent signatures, accepted a clean synthetic PNG, rejected the harmless standard EICAR test file with 422, and rejected an unauthenticated request. Both verdict hashes matched the exact submitted bytes. Cold startup initially returned 503 and recovered on retry; failure did not become a clean verdict. No real ID or billing document was used in these probes.

The application additionally rejects timeouts, redirects, oversized or malformed replies, stale/unavailable engines and hash mismatches. Those failure conditions have client/protocol regression coverage; a forced-stale production engine was not tested. The real renter/upload/admin-approval lifecycle and unattended purge acceptance still need an owner test using synthetic records.

## Deployment and privacy

`cloudflare/scanner/` contains the private Worker, native Durable Object controller, ClamAV image and raw-byte INSTREAM adapter. The `durable_object` scheduling policy selects one fixed `kyc-private` object. Caller-provided names cannot create more scanner instances. The runtime uses `standard-1` (4 GiB memory, 0.5 vCPU, 8 GB disk), and an alarm stops it after five idle minutes. There is no scheduled prewarming. See the scanner README for the pinned accepted image and rebuild procedure.

The independently generated `MALWARE_SCANNER_TOKEN` is a secret on both Workers. Never print it, commit it or expose ClamD's port. Source pins the accepted container image by digest. Temporary GitHub build automation was disabled and its temporary broad deployment token revoked after acceptance. Future image builds require a deliberate build-runner setup; an old revoked token cannot deploy them.

The engine uses the official ClamAV base and FreshClam signature updates. Temporary extraction uses memory-backed `/dev/shm/clamav`; payloads are bounded to 5 MB. Customer filenames, tokens and contents are not logged. Files are not sent to VirusTotal, public sample-sharing services or an OCR provider. The application sanitizes supported image bytes and stores those same bytes in private R2 only after a definitive clean verdict with a matching SHA-256. Two scans may run concurrently.

ClamAV checks file safety, not ID authenticity. An authorized, MFA-unlocked administrator must still review five distinct documents, the billing relationship and physical ID during a live Messenger call, then complete both mandatory approval acknowledgements. Turnstile, rolling quotas, first-rental pickup/meetup rules and seven-day post-clearance retention remain enforced.

## Operation and recovery

If the scanner is sleeping, the first upload can receive retry guidance while signatures and ClamD start. The app's 20-second timeout stores nothing on failure. Retry after a minute; do not mark files clean or bypass scanning. Persistent failures should close intake with `KYC_ENABLED=false`, followed by rebuild/deploy, while the engine is repaired.

Workers Paid has a base charge plus usage. Container memory/disk while awake, active CPU, network, Durable Objects and other services can add charges. A single instance is not a monthly spending cap. Review account usage and billing alerts. References: [Containers pricing](https://developers.cloudflare.com/containers/platform/pricing/), [instance limits](https://developers.cloudflare.com/containers/platform/limits/), [native container API](https://developers.cloudflare.com/containers/api/durable-object-container/), [ClamAV images](https://docs.clamav.net/manual/Installing/Docker.html).
