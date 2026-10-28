# Private HiramShot scanner

This service runs the official ClamAV engine and a bounded in-memory Python adapter. Identity authenticity remains an administrator review with a live call; an antivirus verdict does not validate an ID.

- Deploy `wrangler.jsonc` from the repository root. Workers Builds can build the Dockerfile remotely with `npx wrangler deploy --config cloudflare/scanner/wrangler.jsonc`.
- Store the same independently generated `MALWARE_SCANNER_TOKEN` in this Worker and the application. Never commit it or log request bodies.
- Keep all public routes, workers.dev and preview URLs disabled. The application uses a private service binding.
- One fixed container instance, 4 GiB memory, and a five-minute idle sleep bound resource use. These are not a monthly spending cap.
- Uploaded files stay in memory, with ClamAV extraction restricted to memory-backed storage. FreshClam downloads signatures; client files are not sent to public scanning services.
- Unknown results, old signatures, mismatched hashes, oversized files, unavailable engines and unauthorized requests must fail closed.

Before enabling intake, run real-engine acceptance with a clean synthetic PNG and the harmless standard EICAR test string. Check the exact SHA-256 result, authentication rejection, startup failure and stale-signature behavior. The two Python adapter tests use a protocol fixture and do not establish that the real engine is deployed.

If a temporary build credential is used, disable subsequent automatic builds and revoke that credential after acceptance. Do not leave a broadly privileged CI token active for a one-time build.
