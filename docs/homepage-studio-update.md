# Focused homepage update

## Design direction

Keep the existing hero, featured work, expertise, philosophy, contact and black/gold identity. Change only Process and the Instagram section.

Process becomes a four-stage numbered timeline: Discover, Design, Build and Launch. Each stage explains the work and deliverable. Native disclosure controls reveal the client's role. The old 380vh scroll tunnel and its scroll controller are removed; the new content works without JavaScript and adds no continuous animation.

Instagram becomes a compact social-design service showcase, not an activity feed. Two explicitly labelled illustrative concepts demonstrate post/story layout possibilities. The main action goes to the existing contact form; Instagram remains a secondary external link. The concepts are original HTML/CSS compositions, not fabricated published posts or client work. No Instagram API request, feed loading state, token dependency or repeated-logo fallback is required on the homepage. The existing API remains available.

`scripts/wire-instagram.js` reads the section from `snippets/instagram-section.html` and replaces an existing instance, preventing duplicate sections on future builds. Shared centerline and cookie positioning rules in the old feed stylesheet are preserved. Focused new styles live in `assets/css/home-studio.css`.

## References

- https://linear.app/method — stages and a clear progression from direction to building and launch.
- https://www.resn.co.nz/ — concise presentation of brand, content and digital capabilities.

These informed the presentation; no third-party assets or layouts were copied.

## Validation

41 existing tests and the full quality/build flow passed. Browser checks covered desktop layout, native disclosure controls and both sections at 390px width (no horizontal section overflow). Local project content is mocked; this does not verify production Firebase behavior. Build-generated changes outside the requested scope were excluded.

The requested “magnifier” extension remains pending clarification of which existing interaction and target section the user means. No unrelated cursor or zoom behavior was introduced.
