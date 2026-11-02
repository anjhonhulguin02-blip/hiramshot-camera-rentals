# Live booking controls verification — November 2, 2026

Source `270887d`; Cloudflare Worker version `5f506e7e-9284-4f53-8c05-d72776fc8910`. D1 migration 0013 applied successfully (8 statements); migration 0011 and separate unfinished QA work remain excluded.

106 automated checks passed: 67 general unit/integration, 22 component, 10 account verification, 6 booking controls and one booking-price route check. TypeScript passed in the clean release and integrated local checkout; the native Cloudflare build passed. Existing build chunk warnings remain non-fatal.

Production HTTP checks passed for private API protection, OAuth security checks, email login/recovery, intake readiness and 18 referenced CSS/JavaScript assets. The public November availability endpoint returned all three equipment models and 30 anonymous day states. Anonymous session summary returned signedIn=false. Anonymous admin calendar access was rejected. Real fleet inventory has one active physical unit each for X5, X6 and Neo 2.

Live browser checks confirmed:

- The signed-in client's name/email in the navbar and a readable account menu.
- Cancel booking opens a clear native modal with Keep booking and Yes, cancel booking. Keep booking was chosen; no real booking was cancelled.
- Fly More tap switches the media viewer to the supplied RC-and-extra-batteries photo, with an active package indicator.
- The two requested hero controls are absent.
- The new booking calendar displays the selected dates and exact availability result, alongside the regular X5 quote: two days at 650/day = 1,300, deposit 1,000, downpayment 500, pickup balance 1,800.
- Phone-width rendering measured clientWidth=375 and scrollWidth=375, with calendar width=335. The temporary viewport override was reset. Actual Safari on a physical iPhone was not used.

No real booking, payment, account verification or archive operation was submitted for QA. Admin calendar, archive/restore and MFA boundaries were tested with isolated database fixtures; the live signed-in client did not have owner access. An attempted local-only sample calendar visual preview was unavailable through the browser and was stopped. No authentication or browser security protections were bypassed, and no sample records were published to production.

The owner-notification queue shows one previously accepted setup TEST, with no queued or failed real-event messages at the time of the check. Destination remains hiramshotcamerarentals@gmail.com and the existing five-minute retry schedule is deployed. Provider acceptance does not establish Gmail inbox placement.

Local ignored evidence: outputs/booking-availability-live.png and outputs/neo-flymore-preview-live.png, plus outputs/http-booking-upgrade.log and the test/build logs in the isolated release checkout. The user's original browsing tab and saved bookings were preserved.
