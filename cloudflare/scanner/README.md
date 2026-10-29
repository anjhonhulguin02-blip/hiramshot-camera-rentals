# Private HiramShot scanner

This service runs the official ClamAV engine and a bounded in-memory Python adapter. Identity authenticity remains an administrator review with a live call; an antivirus verdict does not validate an ID.

- Deploy `wrangler.jsonc` from the repository root. It pins the accepted image by digest, so deploying Worker code does not need local Docker. To rebuild the image on an owner-controlled runner, temporarily replace `images.engine.image` with `images.engine.dockerfile: "./Dockerfile"`, build and deploy, complete acceptance, then pin the new digest again.
- Store the same independently generated `MALWARE_SCANNER_TOKEN` in this Worker and the application. Never commit it or log request bodies.
- Keep all public routes, workers.dev and preview URLs disabled. The application uses a private service binding.
- One fixed container instance, 4 GiB memory, and a five-minute idle sleep bound resource use. These are not a monthly spending cap.
- Uploaded files stay in memory, with ClamAV extraction restricted to memory-backed storage. FreshClam downloads signatures; client files are not sent to public scanning services.
- Unknown results, old signatures, mismatched hashes, oversized files, unavailable engines and unauthorized requests must fail closed.

Real private-binding acceptance passed on 2026-10-29: recent signatures, unauthorized-request denial, clean synthetic PNG acceptance, harmless EICAR rejection and matching SHA-256 values. Three Python regressions cover the protocol, stale signatures and binding without reverse DNS. Python protocol fixtures alone do not establish real-engine acceptance.

If a temporary build credential is used, disable subsequent automatic builds and revoke that credential after acceptance. Do not leave a broadly privileged CI token active for a one-time build.
