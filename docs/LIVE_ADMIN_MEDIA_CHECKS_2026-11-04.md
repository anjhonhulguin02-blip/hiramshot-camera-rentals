# Live verification - 4 November 2026

Native Cloudflare application version: `f4253033-992b-4e64-a452-938eb86f69d5`. Application source: `106adf4` (includes `6301e31` administrator uploads/known-client approval and `b3d4e17` 10 MB/public-media loading fixes).

- 127 automated checks passed: 75 general security/pricing/finance checks, 28 component checks, 11 account-verification checks, 7 administrator-upload/exception integration checks, and 6 booking-control checks. TypeScript and the native production build passed.
- 54 live checks passed, plus an exact-byte check of the deployed admin bundle. Ten public pages returned HTTP 200, including gear-only booking links for X5, X6 and Neo 2 and empty/malformed date queries. All 38 referenced media/code/caption resources loaded. Original logo and product image bytes matched the source files, including the versioned/retry URLs.
- Live configuration reported `uploadMaxBytes=10485760` and `kycEnabled=true`. Successful public media/code can cache; private pages and endpoints remain no-store. Unauthenticated calls to the new administrator endpoints and existing private endpoints were rejected.
- Migration `0015_admin_requirements_and_exceptions` applied atomically in 15 statements. Standard document-review guards remain in place. The unfinished `0011` migration was excluded. No real client was approved or payment recorded by these checks.
- Administrator uploads retain privacy, mandatory antivirus, size/type/duplicate checks, consent acknowledgement and attribution. Tests cover unauthorized/cross-origin calls, duplicate IDs, malware verdicts, maximum file size, limits, and account-to-booking provenance transfer.
- Known-client approval is bound to one booking revision, requires administrator MFA, explicit responsibility acknowledgements, relationship/reason and the exact booking reference. Reasons are encrypted and the decision history is append-only. It does not fabricate uploaded IDs, a video call, account KYC verification or repeat-client status. Saved personal/emergency details and payment/contract/availability/deposit rules remain enforced.
- Race/failure checks covered an upload completing after an approval, failed compensating object deletion with eventual private cleanup, and an uncertain database reply after a successful commit.

The production private scanner remains present with version `80274f15-ba88-4ba6-91e1-84d76f31aea3` and its pinned 10 MB engine image. The earlier real-engine acceptance used synthetic data: exact 10 MiB clean content accepted, one extra byte rejected, harmless EICAR rejected, and unauthenticated access rejected. The isolated test Worker returned 404 after cleanup; its container application and temporary local credentials were removed. The production scanner and its credentials were preserved.

Live checks used an iPhone Safari user-agent for public requests. They do not substitute for a physical-iPhone rendering test or an authenticated human review of a real client's documents. No real IDs were reused for testing.

Operator guide: [Administrator requirements and exceptions](ADMIN_REQUIREMENTS.md).
