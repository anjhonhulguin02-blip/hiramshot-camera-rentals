# HiramShot deployment target

The owner selected native Cloudflare Workers hosting, Cloudflare D1/R2, and Google sign-in on 2026-10-27. The registered domain is hiramshot.com. Production configuration is `cloudflare/wrangler.app.jsonc`; build through `npm run build:cloudflare`, then deploy its generated `dist/server/wrangler.json` with `npm run deploy:cloudflare`.

`.openai/hosting.json` identifies the older owner-private Sites review deployment. It is retained for recovery and is not the target for this Cloudflare migration. Do not accidentally publish the new Google-authenticated build into that older Sites deployment.

The Cloudflare build resolves `@hiramshot/runtime` to native bindings and `@hiramshot/identity` to Google authentication. Never use incoming Sites identity headers as authentication on the standalone host. Preserve the full security proxy, Worker security headers, review gate and request-scoped trusted ingress context. The private R2 bucket must have public access disabled.

Internal cryptographic keys are initialized only if absent. Never print keys, rotate the data-encryption key casually, commit environment files, or upload KYC files into GitHub. Google OAuth and Turnstile keys go in Worker settings. Private review and KYC intake are separate settings; do not claim live document intake without a configured private malware scanner and successful acceptance checks.
