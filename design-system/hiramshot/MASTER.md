# HiramShot visual direction

Updated 2026-10-28 for the owner-requested cinematic scroll redesign. Adapted from the UI/UX Pro Max hero-centric, motion-driven recommendation to preserve HiramShot's actual brand.

## Design tokens

- Paper `#ffffff`, ash `#f5f5f5`, studio `#242925`, ink `#1e1e1e`, orange `#ff5a1f`, muted `#596571`.
- Display: Outfit, 600–750; body: Work Sans, 400–600. Keep the established fonts and original business logo.
- Large type, controlled photographic panels, generous white space, small viewfinder labels. Rounded photographic frames echo the actual rental cases; forms retain compact controls.
- Desktop content width: 1240px maximum. Phone gutters: 18px. Interactive targets: at least 44px.

## Signature

A studio stage of actual equipment photographs suspended in CSS 3D space. Pointer tilt and scroll depth introduce the three gear choices. A second, sticky film viewer changes the kit footage as each model's story enters view. These are photographic planes, not fabricated product models or stock travel footage.

Layout: sticky navigation → split cinematic hero → date calculator → compact catalog/rate dialogs → three-perspective gear films → rental steps → verified renter stories → FAQs → booking CTA.

## Motion and usability

- Native scrolling, GSAP ScrollTrigger, scoped context cleanup, transforms/opacity only. Never delay or lock navigation, scroll or booking controls.
- All content is readable without animation. Honor reduced motion; provide a page motion switch. Revert motion when paused and on component teardown.
- Kit films start only with the user's play action and pause offscreen/when the page is hidden. Phone users choose a film with labeled gear tabs; no desktop pinning on phones.
- Preserve exact pricing, clear duration disclosures and direct booking paths. Motion is limited to the storefront; verification and admin forms remain stable.
- Verification: persistent field hints, matching server/client validation, a focusable linked error summary, inline errors and local input retention after failures. Never persist identity-form drafts in browser storage.
- Service setup failures must be distinguished from input mistakes. Provide the working Google path while email authentication is unavailable. Keep KYC and upload security gates enforced.

## Source assets

Original photographs and MOV clips from the owner-supplied `camera rentals clips and photos` directory. Optimize copies for web delivery; preserve original files. No customer identity files or real enrollment keys are used in visual tests.
