# Client verification upload fix — November 2, 2026

Source: `08a3bfb`. Production Cloudflare Worker version: `851c216c-f375-4b23-b8f0-e5e78e13ede1`.

The scanner request was constructed with `redirect: 'error'` outside its error boundary. Native Workers rejected that setting with a TypeError before contacting the private scanner. Node tests accepted the setting, so the bug reached production and appeared as the generic 500 message for otherwise valid ID photos. A local native Workers probe reproduced the exact rejection using a public gear JPEG, without using a client ID.

The request now uses `manual`. Every redirect fails closed; private bytes and bearer credentials are never forwarded to another destination. Construction failures are handled as a safe scanner-unavailable response. Antivirus, Turnstile, limits, private storage, ID type requirements, human review and live-call approval remain enforced.

The client keeps the selected photo and entered information after failed submissions. It distinguishes a confirmed upload from a failed checklist refresh, offers checklist reconciliation after ambiguous timeouts, and shows successful receipt separately from errors. Booking refreshes retain the verification form rather than unmounting it. The signed-in navbar no longer offers “Set up email sign-in”; email/password, password recovery and Google sign-in remain enabled.

Validation:

- 72 general tests, 22 component checks and 10 account-verification integration checks passed. TypeScript passed in both the clean release and integrated working checkout. The native production build passed with existing non-fatal chunk warnings.
- Native Workers probe passed image sanitization, image dimensions, scanner-request construction/response handling, multipart File handling and a real private R2 put/get/delete round trip (180,521 sanitized bytes). The scanner response in this diagnostic was a local stub; it was not a new real-engine antivirus acceptance test. No test identity record was created.
- Redirect tests cover HTTP 301/302/303/307/308 for both private service bindings and HTTPS scanners, with a single fetch and a 503 result. Error-response tests cover field guidance, HTML failures, expired sessions, oversized files, request limits and incomplete receipts.
- Production HTTP checks confirmed KYC and email/password enabled, anonymous verification/upload endpoints rejected with 401, normal login/recovery options present, the removed menu link absent, and all 23 referenced browser assets returning 200.
- Live signed-in browser check confirmed the menu removal and that choosing Driver’s License enables camera capture and the file chooser. No real client ID was uploaded or approved for QA. The user's original tab and selected file were not reloaded or changed.

No schema migration, new hosting plan, new token, credential rotation, public bucket access or administrator allowlist change was needed. Separate unfinished QA work and migration 0011 were excluded. Local evidence: `outputs/account-menu-upload-fix-live.png` in the main checkout; upload test, build and deployment logs in the isolated release checkout.
