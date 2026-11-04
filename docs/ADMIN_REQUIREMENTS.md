# Administrator requirements and known-client approval

In the rental desk, open a booking and expand **Add requirements received through Messenger**. An administrator with an unlocked two-factor session can select the requirement and ID type, choose a client-supplied file, acknowledge the client's authorization, and upload it privately. The Verification tab offers the same uploader for pending account requirements.

The upload uses the existing private R2 bucket, mandatory byte-bound antivirus verdict, 10 MB limit, document format and image checks, distinct ID types, duplicate-file checks, and shared ten-attempt account/IP limit. MFA authenticates administrator uploads; the client endpoints continue to require Turnstile. Each administrator upload records its source and uploader, and still needs identity review. Reviewed documents require explicit removal before replacement. No Messenger integration retrieves files automatically.

For a relative or personally known renter, open **Open verification approval**, then **Approve a relative or personally known client**. Choose the relationship, explain the decision, confirm both responsibility acknowledgements, and type the exact booking reference. Saved client verification and emergency-contact details are still required. This waives missing documents and the video call for that exact booking revision only.

The exception is available only to administrators with current two-factor verification. It does not mark documents reviewed, fabricate a video call, set the account's KYC status to verified, confer repeat-client status, or grant courier access. Account-level document approval retains the standard five-document and live-call requirements. The exception is recorded in an append-only table with an encrypted reason and signed audit events. Never include ID numbers or document copies in the explanation.

Reservation payment, active-account checks, availability, signed agreement, rental balance, refundable deposit and handover inspection remain required. An exception from another booking or a stale verification revision cannot be reused. Files remain private and follow the existing retention and cleanup process.

Migration: `0015_admin_requirements_and_exceptions.sql`. Apply it atomically before deploying the matching application. Do not apply unrelated unfinished migrations.

Validation: `npm run test:admin-requirements`, `npm run test:account-verification`, `npm run test:components`, `npm run test:booking-controls`, `npm test`, TypeScript and the native Cloudflare production build. The tests use synthetic files and a local database; they do not approve real clients, send Messenger messages, or submit real payments.
