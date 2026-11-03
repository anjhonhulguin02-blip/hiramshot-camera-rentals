# Gear-only booking links — November 3, 2026

Source `919dc44`; production Worker version `6dedd4fb-20c2-464e-bb30-fe445e154013`.

Clicking a gear-only link such as `/book?gear=x5` previously returned HTTP 500. The wizard passed an empty date plus a time suffix to the availability calendar. The calendar used the non-empty time suffix as its initial month, and formatting that invalid month threw `RangeError: Invalid time value` during server rendering.

The calendar now validates the pickup date before deriving a month and defaults to the current Manila month for missing, partial or invalid dates. Valid selected dates retain their calendar month. Booking availability and final reservation overlap checks are unchanged.

Full-wizard rendering tests cover X5, X6, Neo 2, no selected gear, empty dates and invalid dates. Calendar tests cover partial timestamps and impossible dates. TypeScript and the focused native production build passed. Live anonymous HTTP checks returned 200 with the wizard and calendar for all three gear-only links and both malformed/empty-date variants. Browser UI verification was unavailable because the computer-use tool could not initialize; no claim is made that a new booking was submitted or that a physical-device checkout was tested.

This hotfix was built from a clean archive and deployed separately from the pending 10 MB scanner work. The live upload limit stayed at 5 MB during that deployment. No client records were changed for QA.
