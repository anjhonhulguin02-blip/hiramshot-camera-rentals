# Email/password and Google sign-in

Updated 2026-10-29. Email/password is enabled on hiramshot.com alongside Google. Email accounts can use Gmail, Yahoo, Outlook or another valid provider. Apple sign-in remains deferred. The native Cloudflare Email Service sends from `accounts@hiramshot.com`, with the business Gmail as reply-to. No Resend account, SMTP password or additional email API key is required by this deployment.

## Customer steps

1. For a new email/password account, open `/create-account`, enter a name and email, accept the displayed privacy consent and complete the security check, then choose **Send verification link**.
2. Open the HiramShot message from `accounts@hiramshot.com`, checking Spam/Junk if needed. Follow its link and choose/confirm a password on the website. Verification links expire after 30 minutes; request a new one if expired.
3. Use that email and password at `/login`. Show/hide password and password-manager paste are supported. **Forgot password?** sends a reset link valid for 15 minutes.
4. Existing Google users should sign in with Google and choose **Set up email sign-in** in their portal to add a password to the same account. The email must match. Identities are not silently merged.

**Continue with Google** already proves email ownership through Google's verified identity. Google's “Keep track of your Google Account data” email is a sign-in notice, not a HiramShot verification link. Identity-document approval is a separate five-document and live-call process.

## Configuration and acceptance

The sending domain's bounce MX, SPF, DKIM and DMARC records are configured. Cloudflare reports Sending Enabled / DNS Configured. A native-binding test to the business inbox was accepted and its activity log showed Delivered. Email body/preview retention is disabled so verification/reset links are not retained as previews.

The app has `AUTH_EMAIL` restricted to sender `accounts@hiramshot.com`, `AUTH_EMAIL_PROVIDER=cloudflare`, a verified sender-domain flag, and enabled password/hash verification flags. Readiness also requires the actual binding and Turnstile credentials; flags alone cannot activate an absent sender. The previous Resend adapter remains an optional fallback, not the active provider. The app limits outbound requests globally and per account/IP.

A production native Worker probe passed synthetic valid/wrong password checks and two concurrent round trips under the configured CPU limit. This is not a CPU-accounting benchmark. Automated token expiry, purpose, replay and credential-version tests passed. The owner must still complete the human create-email-link/password/sign-in/forgot-password sequence; the agent has not entered or changed a real password.

## Storage and access protections

- D1 stores scrypt hashes, not plaintext or reversibly encrypted passwords: N=32768, r=8, p=3, random 16-byte salt, constant-time verification, 10–128 character passwords (owner-requested minimum updated 2026-10-29). Common predictable passwords remain rejected.
- Verification/reset links use random 256-bit tokens. Only token hashes are stored. The URL fragment is removed on load; only an explicit POST consumes a token. Email-scanner GETs cannot change a password.
- Token consumption and credential-version updates use D1 batch/compare-and-swap guards. Replays/stale tokens fail. Password changes invalidate older password sessions.
- Writes enforce same origin, bounded bodies, Turnstile hostname/action and rolling quotas. Unknown/ineligible addresses receive a generic response to limit account enumeration.
- The private three-email administrator allowlist, active role and administrator MFA are required separately. A contact email, database role alone or forged identity header cannot grant owner access.

References: [Cloudflare sending API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/), [sender bindings](https://developers.cloudflare.com/email-service/configuration/send-bindings/), [email pricing](https://developers.cloudflare.com/email-service/platform/pricing/), [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
