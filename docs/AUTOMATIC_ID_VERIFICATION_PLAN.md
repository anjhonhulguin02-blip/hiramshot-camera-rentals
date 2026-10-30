# Automatic identity verification: preparation and budget

Researched 30 October 2026. This is a proposed integration, not an activated service. No vendor account, paid plan, API credentials or transfer of customer documents was created for this research.

## What works now

Account Requirements and booking verification share guided camera capture, Philippine ID categories, local preview/retake, minimum photo dimensions and private antivirus scanning. A client-selected type and a clean file are not evidence that an ID is genuine. Unrelated photos can still pass these file checks; only document review establishes the current identity decision. Administrators must review all five distinct requirements and complete the Messenger physical-ID call. A new upload never approves identity or reserves equipment.

## Shortlist and costs

Published USD prices; taxes, foreign-exchange charges and extra modules may add cost. Recheck the actual quote before activation.

| Provider | Public entry price | Budget implication |
| --- | --- | --- |
| Didit | From **1 November 2026**, Free has no subscription and **$10 monthly credit**, conditional on a work email. Full check **$0.33**: document, passive liveness, face match, device/IP. About 30 such checks fit the credit. | Candidate for a small pilot, subject to eligibility, coverage and privacy acceptance. The earlier 500-free-check offer is changing; do not budget on it. [Announcement](https://didit.me/blog/new-pricing-november-2026/) |
| Veriff Essential | **$0.80 per verification**, **$49 minimum/month**; 15-day trial. | Higher recurring minimum. Ask which plan includes the required review and deletion features. [Pricing](https://www.veriff.com/pricing) |
| Sumsub Basic | **$1.35 per verification**, **$149 minimum/month**. | Higher minimum for this launch volume. [Pricing](https://sumsub.com/pricing/) |

For **one** $0.33 check per session with $10 credit, illustrative monthly usage is: 30 checks $0; 100 checks $23; 300 checks $89. These are arithmetic estimates, not quotes or a count of renters. Two IDs, retries and additional checks change usage. Completed negative outcomes can also be billable. Didit lists proof-of-address at $0.20 separately. [Announced rates](https://didit.me/blog/new-pricing-november-2026/)

Do not enable automatic top-ups. Start sandbox-only; require a separately approved spending cap before real checks.

## Philippine coverage and official authentication

The [public Didit coverage list](https://didit.me/supported-documents/) uses its [published coverage endpoint](https://verification.didit.me/v1/organization/documents-allowed-by-country). The PHL entry read on the research date includes driver licenses, passports, ID cards including digital/UMID/senior/voter variants, and health-insurance, social-security and tax-card categories. That is category-level evidence, not confirmation of every PhilHealth/PRC/Postal/PWD card version. Confirm the actual issuer, issue year, front/back requirements, expiry rules and sample acceptance with the vendor before marking any category automatically supported. Cards usually require two sides; passports use the photo page. Keep unsupported formats in clearly labelled manual review.

PSA offers a separate [National ID authentication onboarding process](https://rsso07.psa.gov.ph/content/psa-central-visayas-reiterates-call-integration-national-id-authentication-services). The admin viewer links to [National ID Check](https://everify.gov.ph/check) for the reviewer to operate. No customer data is automatically sent there. Direct PSA integration requires relying-party onboarding; eligibility, exact private-business documents and fees must be confirmed with PSA. It does not authenticate every Philippine ID.

Document/face analysis and issuer-registry lookup are separate controls. Do not describe a general eKYC result as a successful LTO, PhilHealth or PSA database match unless the exact issuer lookup was contracted, performed and returned that result.

## Owner setup requirements before a pilot

1. Create a business-owned provider organization and a separate sandbox application; designate authorized operators with MFA. Didit documents self-service organization/workflow creation and API keys in [its setup guide](https://help.didit.me/getting-started/create-your-account). Prepare the business name, website, contact and use case. Ask the provider whether registration papers, a business representative ID or other KYB evidence are required for HiramShot; these were not confirmed as mandatory for this account.
2. Confirm the work-email requirement for the new free allowance. A branded Gmail address is not a domain mailbox. Use a working, owner-controlled `@hiramshot.com` mailbox or forwarding alias if required, after verifying delivery and account recovery. Existing outbound `accounts@hiramshot.com` alone does not prove that it receives mail.
3. Agree document-format coverage and require genuine-document checks, liveness and face match. Decide how the second distinct government ID is checked and priced. Company/school ID and household billing relationship still need the business review.
4. Review the provider's business terms, DPA, subprocessors, processing location, biometric use, security and deletion behavior. Update HiramShot's privacy notice and explicit consent before third-party processing. Disable optional face-search/blocklists, training or reuse unless separately justified and approved. Do not silently forward existing uploads.
5. Confirm a deletion API usable on the selected plan. Didit documents per-session deletion, but configured retention starts at one month; HiramShot therefore needs its own seven-day scheduled deletion. Session deletion does not erase every other provider record, so separately address blocklists, user profiles and audit retention. [Deletion behavior](https://help.didit.me/data-privacy/delete-verification-data), [data handling](https://help.didit.me/data-privacy/how-didit-protects-data)
6. Store API and webhook secrets in private Worker settings, never chat, source, URLs or browser code. Keep sandbox/live workflow IDs separate. Obtain an approved budget and make the cost of retrying visible to operators.

## Proposed integration contract

These are implementation requirements for the next phase, not routes enabled by this change.

- `POST /api/identity/sessions`: authenticated, active client, same-origin, Turnstile, hourly quota and explicit provider consent. Bind a single-use hosted session to the internal account, verification case/version and workflow. Never accept a client-provided user ID or final verdict. Store only the minimal provider reference and status needed. Use a random opaque vendor reference rather than email/ID number.
- Budget ledger: reserve the maximum approved cost atomically before session creation. Cap account/IP attempts and total monthly spend; stop when the credit/cap is exhausted. An uncertain network response must not trigger an automatic second billable creation. Reconcile pending attempts before retry. A manual-review path stays available.
- Hosted capture: let the approved vendor collect required front/back images and liveness directly after consent. Avoid duplicating sensitive photos in both systems unless needed for the reviewed business workflow. Allowlist the exact provider URL; no open redirect or API key in the browser.
- `POST /api/identity/webhooks`: validate the documented raw-body signature, timestamp and replay controls before processing. Enforce payload limits, idempotent delivery IDs, correct application/workflow/environment and session ownership. Fetch the authoritative final result server-side. Browser return pages never establish success.
- Decisions: expired, mismatched, missing, declined, inconclusive, unverified-signature or unknown outcomes remain rejected/pending manual review. Invalidate a result when the bound case or documents change. Show a useful retry/manual-review reason without exposing fraud thresholds.
- Preserve business gates: automatic evidence augments the admin review. The five requirements, two distinct government ID types, physical-ID call, inventory, agreement and confirmed downpayment remain required. A provider approval cannot directly mark a booking reserved or release equipment.
- Retention: queue provider-session deletion alongside private R2 deletion, using the same seven-day post-cleared-return rule and unlinked-case expiry. Retry failures, verify removal, suppress delayed callbacks for purged cases and keep only minimal non-sensitive audit evidence. Test profile/biometric deletion separately; do not claim complete erasure from session deletion alone.

## Acceptance before enabling live checks

Sandbox fixtures must cover valid, altered, unrelated, expired and mismatched samples, missing/back-side capture, liveness/face failure, provider outage, unsigned/replayed/duplicate webhook, wrong account/workflow, exhausted budget, changed case version and deletion retries. A successful callback must still fail reservation without the separate business gates. Test signed webhook/deletion against the chosen plan, then perform an owner-approved small pilot with suitable consent. No real customer ID is required for initial development.

Remaining owner decisions: provider, verified document coverage, privacy/retention terms and an explicit live-check budget. Recommended next step is a Didit sandbox pilot after those onboarding details are reviewed; live automatic verification stays off until acceptance passes.
