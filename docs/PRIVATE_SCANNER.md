# Private antivirus setup — prepared, not activated

The owner chose to retain antivirus scanning and, on 2026-10-28, instructed us not to activate anything that costs money. **No scanner infrastructure, paid Workers plan or subscription has been activated. KYC_ENABLED remains false.** The Requirements tab and private admin viewer can be deployed independently. A working upload lifecycle has not been accepted.

## Prepared deployment

`cloudflare/scanner/` contains a separate private Cloudflare Worker and ClamAV container. It has no domain, workers.dev endpoint or preview URL. The application will call it through a service binding with a separate strong bearer token. Only one fixed container instance can be created; it sleeps after five idle minutes. There is no scheduled prewarming or always-on scanner.

The container uses the official ClamAV image, FreshClam signature updates and a small raw-byte INSTREAM adapter. Customer filenames and contents are not logged. No customer file is submitted to VirusTotal, a public sample-sharing service, or an OCR provider. ClamD temporary extraction uses memory-backed `/dev/shm/clamav`. Upload payloads are held in memory, bounded to 5 MB, and never saved to R2 before a definitive clean result. Up to two scans run concurrently. Missing, stale (over 48 hours), malformed or unavailable engine results fail closed. The adapter returns the SHA-256 of the exact scanned bytes; the app verifies that hash before storing those bytes.

File safety does not establish that an ID is authentic. An authorized administrator still reviews the five distinct documents, billing relationship and physical ID during a live Messenger call, then completes both mandatory approval acknowledgements. Existing rate limits, Turnstile, first-rental handover rules and seven-day post-clearance purge policy remain in force.

## Cost and prerequisites

Cloudflare Containers requires Workers Paid, currently **$5 USD/month plus usage**. `standard-1` provides 4 GiB RAM, 0.5 vCPU and 8 GB disk, matching ClamAV's preferred 4 GiB. It is not a fixed $5 total: allocated memory/disk while awake, active CPU, network, Durable Objects and other Workers usage can add charges. One instance limits concurrency, not the monthly bill. Sleeping reduces costs but introduces startup delays. Sources checked 2026-10-28:

- [Cloudflare Containers pricing](https://developers.cloudflare.com/containers/platform/pricing/)
- [Instance sizes](https://developers.cloudflare.com/containers/platform/limits/)
- [ClamAV RAM requirements and official images](https://docs.clamav.net/manual/Installing/Docker.html)
- [Cloudflare deployment prerequisites](https://developers.cloudflare.com/containers/get-started/)

Docker is not installed in the current workspace environment. No Docker Desktop, paid plan or alternative server has been installed/provisioned. The container build and actual antivirus engine have therefore not run. The TypeScript client tests and Python mock-protocol tests are not real-engine acceptance.

## Activation, only after later owner authorization

1. Obtain explicit approval for hosting cost, install a supported Docker runtime or use an owner-controlled build runner, then rebuild the official base with current security/signature updates. Review the image and run it locally with a strong temporary token supplied through environment, never command arguments or source. Do not publish port 3310. Bind test port 8080 to 127.0.0.1 only.
2. Run `node cloudflare/scanner/acceptance.mjs` against that local container with SCANNER_TOKEN in its process environment. It requires a real recent engine, a clean synthetic PNG, standard harmless EICAR rejection and unauthorized-request denial. Also verify stale signatures, oversized files, concurrent overload, engine shutdown and cold-start recovery. No real IDs are necessary.
3. Deploy `cloudflare/scanner/wrangler.jsonc` on the approved paid account. Store the same independently generated 32+ character MALWARE_SCANNER_TOKEN as a secret on both scanner and app Workers; never print or commit it. Confirm the scanner has no public routes or preview endpoints and logs contain no document data. Secrets must not be entered into a browser by the agent without the required credential handoff.
4. Add to the **app source** Wrangler config: `"services":[{"binding":"MALWARE_SCANNER","service":"hiramshot-private-scanner"}]`. Do not bind this before the scanner exists. The binding is optional and currently absent. The HTTPS URL/token fallback is also available, but its response must include both boolean `clean` and matching `sha256`; redirects are rejected.
5. Perform authenticated synthetic acceptance through the deployed private binding. Confirm positive/negative verdicts, recent signatures, timeouts and no R2 storage on failed scans. Cold starts may exceed the app's 20-second timeout; it gives retry guidance and stores nothing. Confirm a retry becomes ready before opening intake. Do not add constant prewarming without a separate cost decision.
6. Only after acceptance, set KYC_ENABLED=true in source config, rebuild and deploy the app. Test one synthetic renter/admin lifecycle: all five documents, missing-file denial, unauthorized preview denial, allowed MFA-protected preview, manual live-call acknowledgement, approval, and seven-day purge scheduling. Complete an unattended purge acceptance test before customer launch. Delete test artifacts through the authorized test workflow.

If any acceptance check fails, return KYC_ENABLED to false and leave uploaded-file intake closed. Do not replace scan verdicts with automatic clean responses or allow unscanned uploads to meet a release deadline.
