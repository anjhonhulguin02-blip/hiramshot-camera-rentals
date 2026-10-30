# HiramShot After Dark — Halloween 2026

Owner approved 10% off camera/drone rental fees and bookings **and pickup** through November 3, 2026, Philippine time. Campaign window: `2026-10-30T00:00:00+08:00` inclusive through `2026-11-04T00:00:00+08:00` exclusive. Returns may be later, subject to the existing maximum 30-day rental period. The server clock decides new-booking eligibility.

| Gear/package | 1–2 days, per day | 3–6 days, per day | 7–30 days, per day | Refundable deposit |
| --- | ---: | ---: | ---: | ---: |
| Insta360 X5 Standard | ₱585 | ₱495 | ₱405 | ₱1,000 |
| Insta360 X6 Standard | ₱720 | ₱630 | ₱540 | ₱1,500 |
| DJI Neo 2 Standard | ₱450 | ₱405 | ₱315 | ₱800 |
| DJI Neo 2 Fly More Combo | ₱630 | ₱540 | ₱450 | ₱800 |

These are 90% of the current catalog daily rates. Add-ons and refundable security deposits are unchanged. The existing camera + drone combo discount remains ₱150/day and stacks once after the gear discount. The 30% / minimum ₱500 downpayment rule remains. Backend arithmetic uses integer centavos before returning peso amounts.

The home page, duration tiers, price dialogs, booking calculator and saved quote use the same campaign rules. Regular daily rates remain visible with a strike-through alongside the eligible promo rate. Pickups after November 3 show regular prices. A stale expected client total causes a review/reload error, rather than silently creating a booking at a different total. The server ignores client-supplied campaign percentages.

Existing booking snapshots are not modified. A qualifying new booking stores its promotion identity, percentage, savings, original total, acceptance time and campaign cutoff in the quote; its PDF agreement includes the savings. The saved quote continues to apply after campaign expiry. Base inventory/rate records are not overwritten and no existing contract or financial transaction is rewritten.

The seasonal art direction uses the original business logo, actual supplied gear photos, photographic contact sheets, warm amber/aperture geometry and the established Outfit/Work Sans typography. Responsive layouts and a pause/reduced-motion path remain. The seasonal hero and promotional advertising automatically switch back after the cutoff, including on an open page; no fake countdown or unrelated stock model is used.

Unit checks cover every package/tier, exact Philippine-time start/end boundaries, pickup eligibility, combo/add-on/deposit treatment, decimal precision and saved snapshots. API checks verify the actual persisted total and forged/stale-price handling. Component checks cover the campaign and expired page, price/checkout agreement and ineligible-date explanations.
