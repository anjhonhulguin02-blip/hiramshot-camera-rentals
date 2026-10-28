# Legacy Sites deployment and custom domain setup

This section records the older Sites deployment. The domain hiramshot.com has since been registered and the owner selected native Cloudflare Workers hosting. Use docs/CLOUDFLARE_LAUNCH.md and cloudflare/wrangler.app.jsonc for the current launch. Do not apply this legacy guide to the new Google-authenticated host.

The older deployment remains owner-private at https://hiramshot-camera-rentals.icycomet64.chatgpt.site. No custom domain was attached to that legacy Sites deployment. This guide prepares the connection without changing the site's audience.

## Runtime configuration

Use native Sites runtime environment settings, not committed `.env` files. The tracked `.env.example` lists every application key. Keep each encryption, signing, MFA-session, scanner, and maintenance secret distinct. Preserve existing production keys: rotating the encryption key without a migration would make stored records unreadable.

Set `APP_BASE_URL` to the chosen HTTPS canonical origin once the domain is verified. `NEXT_PUBLIC_SITE_URL` is an optional fallback; use the same origin if set. Set `CUSTOM_DOMAIN` to the canonical hostname without a scheme or path. All application API calls and sign-in return paths remain relative. Canonical, OpenGraph, robots, and sitemap URLs come from `lib/site.ts`.

`ADMIN_CONTACT_EMAIL` is the public business email, currently `hiramshotcamerarentals@gmail.com`. The native deployment now uses only the private `ADMIN_ACCESS_EMAILS` Worker secret for its three approved operator emails; older `ADMIN_EMAILS` / `ADMIN_USER_IDS` settings and contact addresses grant no native operator access. Verified identity, an active role and MFA are also required. Never create a default password or make a client-supplied role authoritative.

## Obtain exact DNS records

After choosing and registering the domain, attach its root and `www` hostnames with the native Sites custom-domain operation for this existing project. Use the **exact records returned by that operation**. No account-specific A address, CNAME target, or verification token exists yet, so none can honestly be supplied in advance.

| Host | Record | Required value |
| --- | --- | --- |
| `@` / zone apex | A | Every apex IPv4 target returned by Sites |
| `www` | CNAME | The subdomain target returned by Sites |
| Verification host, if supplied | TXT | Exact platform verification value |

Remove only conflicting records for the same web host after reviewing current DNS. Preserve mail MX, SPF, DKIM, DMARC, and other service records. Follow the returned platform instructions for any DNS proxy setting. If restrictive CAA records exist, use the certificate authority requirements supplied by the platform; do not guess an issuer.

Refresh native domain status until both DNS validation and the managed HTTPS certificate are active. Sites manages TLS issuance and renewal. Do not upload a private certificate key to the repository. Test the root and `www` hostnames before switching the canonical environment values.

## Authentication, cookies, and routing

Sites manages primary registration and sign-in. The app intentionally preserves that integration rather than creating a second local password database. `users.password_hash` is nullable and unused for Sites accounts; there is no fallback password login. The hosting platform must support the new hostname and its sign-in callback before customers use it.

The application's second-factor session uses `__Host-hiramshot-admin`, `Secure`, `HttpOnly`, `SameSite=Strict`, `Path=/`, and a 15-minute expiry. A `__Host-` cookie must not contain a Domain attribute. Root and `www` requests redirect to the configured canonical origin before entering the application, so administrators use one host-bound session. Verify platform sign-in cookies through the supported hosting controls; their flags are managed outside this source repository.

The Worker sets CSP, production HSTS, MIME protection, framing restrictions, and a narrow permissions policy. CORS permits configured root / `www` origins without wildcard access. Mutation endpoints additionally require a matching Origin and reject cross-site requests. Custom-domain alias redirects activate only after `CUSTOM_DOMAIN` is configured. The platform's own authentication and hosted-domain behavior must also be verified after binding.

## Database and seed data

Deploy through the Sites source/build/package workflow. Migration `0002_deep_selene.sql` adds accounts, physical package inventory, interval reservations, payment receipts, payment masters, an append-only revenue/deposit ledger, reversal references, and booking snapshots. It preserves prior bookings and applied migrations. Back up existing data through supported hosting operations before a production migration.

The production migration seeds the official administrator profile and the four approved packages, backed by three physical units. It does not invent serial numbers, replacement values, customer records, or earnings. Sign in as an authorized administrator, enroll MFA, and record the real serial numbers, battery codes, SD card details, and agreed replacement values.

Run `npm run seed:generate` for synthetic SQL in ignored `outputs/seed-local.sql`. Run `npm run seed:local` only after a build and local migrations; the script hardcodes `--local` and rejects unsupported options. Demo clients use `example.invalid` addresses and `is_demo=1`. Demo bookings and transactions are excluded from customer lists and live analytics. Never execute that fixture against production. `node scripts/seed.mjs --bootstrap-only` generates a seed containing only the approved catalog and administrator profile.

## Private review and customer launch

Keep `PUBLIC_INDEXING_ENABLED=false` while private. The Worker sends noindex headers, robots disallows crawling, and the sitemap contains no public URLs. After the owner deliberately chooses a public audience and customer launch is ready, set indexing true. The sitemap exposes only the home, policies, and privacy pages; customer, admin, booking, and API routes remain noindex.

Before live intake, configure genuine hostname-bound Turnstile credentials and a private HTTPS malware scanner. The scanner accepts raw octet-stream uploads with bearer authorization and must return `{"clean":true}` only after successfully checking the file. Define its privacy and deletion behavior. Enable `KYC_ENABLED=true` only after those controls work. Booking submissions, KYC, and receipts currently fail closed where their required services are absent.

KYC deletion is scheduled in the database **seven calendar days after clearance**, even if the actual return happened earlier. A Worker scheduled handler and an authenticated maintenance endpoint exist. An unattended hosting schedule has not been activated or proven; the current owner can run eligible deletion through the MFA console. Provision a supported unattended execution path and verify a synthetic scheduled deletion before describing auto-purge as operational. A prior proposal for an additional service-token deletion ingress was rejected by automatic approval review and is not part of this deployment.

Run a synthetic full lifecycle: sign-in, profile, exact-time quote, verified external downpayment, reservation, five document uploads, video call, agreement signature/download, rental/deposit collections, turnover, return assessment, deposit refund, reversal correction, and retention. Check both account roles, denied cross-account access, mobile layouts, domain redirects, HTTPS, and backup recovery. Browser end-to-end verification and external service setup remain release conditions.

Amounts are integer centavos in the database. `is_net_revenue` reports recorded rental collections, not profit after expenses and taxes. Security deposits are liabilities; damage recoveries are reported separately. A completed refund is recorded only after an external payout; this application does not transfer money. Finalize the retention policy for account profiles, receipts, signed contracts, and financial history before public launch. The seven-day purge applies to booking verification files and details, not independently saved account profiles or financial records.
