# Email/password setup

Google sign-in works on hiramshot.com. The owner asked to prepare manual email/password, show/hide password and recovery while there is no transactional email account. Apple sign-in was deferred after confirming the Apple Developer Program has an annual membership fee.

The UI now provides login, create-account email verification, forgot password, new-password confirmation and show/hide controls. Email/password stays disabled until the external setup below is complete. No email was actually sent during implementation.

## Storage and validation

- D1 contains password hashes, not plaintext or reversibly encrypted passwords. The native Node crypto implementation uses scrypt N=32768, r=8, p=3, 16 random salt bytes and constant-time verification. This is one of [OWASP's documented configurations](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
- New accounts prove email ownership before choosing a password. Verification links expire in 30 minutes; reset links in 15 minutes. Only a SHA-256 digest of a random 256-bit token is stored. The link token stays in the URL fragment, is removed from browser history on load, and is consumed only by an explicit POST, never by an email scanner's GET.
- Token consumption and credential/version update use one D1 batch and compare-and-swap guards. Replays and stale tokens fail; completed password changes invalidate earlier password sessions, including the private review gate. Google sessions remain governed by Google authentication and the application session lifetime.
- API writes require same origin, bounded request bodies, CAPTCHA and account/IP quotas. Unknown or ineligible email addresses get the same generic response. Email delivery runs after that response so provider latency is not an account-existence signal.
- Existing Google renters must first sign in with Google, then choose **Set up email sign-in** from their portal and verify the same email. Another provider identity is never silently substituted for their rental history. New email users complete the existing emergency-contact registration before booking.

## Required activation

1. Create a business-owned Resend account and verify the sending domain's DNS records. Use an address such as `accounts@hiramshot.com`; the existing Gmail address remains the reply-to/contact address. Follow [Resend's domain and email documentation](https://resend.com/docs/dashboard/domains/introduction).
2. Store `RESEND_API_KEY` as a Worker secret and set `AUTH_EMAIL_FROM` to the verified address. No real values belong in this repository.
3. Turnstile is configured for hiramshot.com. Actions for this feature are `login`, `password_email` and `password_complete`; the backend validates both hostname and action.
4. Benchmark password hashing under the intended production Worker plan and verify concurrent-load/resource limits. A synthetic local workerd round trip passed (approximately 246 ms hashing, 448 ms including verification on this workstation). This is not a measurement of production CPU accounting. Do not weaken the work factor to fit a Free CPU limit or enable it on an unsuitable plan. No paid plan was activated.
5. Test actual email delivery, repeated/expired links, wrong passwords, rate limits, password-manager/paste support, reset session revocation and linked-owner access. Only then set `PASSWORD_HASHING_VERIFIED=true` and `PASSWORD_AUTH_ENABLED=true` and redeploy. These switches remain false today.

The owner-approved three-email administrator allowlist is stored in the private Worker secret ADMIN_ACCESS_EMAILS, outside GitHub. Verified sign-in, an active matching profile, the server allowlist and administrator MFA are all required. A contact address, stale database role or incoming identity header grants no operator access.
