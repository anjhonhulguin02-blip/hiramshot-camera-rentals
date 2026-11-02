# Next-ID capture flow — November 2, 2026

Source `3d6d50d`; production Cloudflare Worker version `425f16e2-ee2d-44da-815c-a77d7556b3d8`.

The form previously used the selected ID type to enable both capture and submission. Moving to government ID 2 cleared that selection, which made the camera and file picker appear unavailable. Capture is now available before choosing a type; only submission requires the type. Changing an ID type keeps the chosen photo. Successful uploads advance to the next missing requirement and identify it in the receipt message. Retakes restore a stored ID type when available.

A prominent hint explains the required type before submission. When the other government ID has a recorded type, the form names it and explains that a different type is required. The original server checks for supported types, distinct government IDs, consent, Turnstile, quotas, malware scans, ownership and manual review are unchanged. Reviewed files stay locked; private storage is not exposed.

Validation: 24 component checks and 10 account-verification integration checks passed, including the second-ID blank-type regression, all remaining requirements, reviewed-file locks and distinct ID enforcement. TypeScript and the native production build passed. Existing non-fatal build chunk warnings remain.

Live browser verification selected government ID 2 with “Choose ID type” still selected and confirmed both capture controls enabled. Screenshot: `outputs/next-id-capture-live.png` in the main checkout. Production configuration reported KYC enabled, and an anonymous upload was rejected with 401. No real client documents were uploaded or approved for QA; the user's original form was not reloaded or modified. No schema or credential changes were required. Separate unfinished QA changes remain excluded from this release.
