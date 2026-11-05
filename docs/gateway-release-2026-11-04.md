# Taurus Gateway release — responsive presentation and access hardening

The approved scope is a full-viewport Taurus gateway with a restrained balance between the original sparse view and the enlarged metal-wall treatment. The existing reference door and emblem are preserved. Desktop scene size is between the two earlier versions, leaving space above and below; narrow screens show the entire scene without cropping. A continuous charcoal background uses only a faint desaturated metal texture, without edge bolts or framing. Access controls are frameless, with one muted-gold primary action, a quieter Telegram alternative, and a large unboxed verification code replacing the method buttons when requested.

Ambient conduit flow is slower and less bright. The 2.7-second verified-opening sequence, pause control, background-tab pause, and reduced-motion fallback remain. Authentication behavior and the public homepage are unchanged.

## Authentication

- Telegram starts only after an explicit button press. Requests are bound to a 15-minute Secure, HttpOnly, host-only, SameSite=Strict challenge cookie. Approval expires after five minutes and is atomically consumed once before minting a token. Losing the token response requires a new verification.
- Passkey challenges are browser/request-bound, expire after two minutes, and are consumed atomically. Stored credential counters reject replay while allowing synchronized passkeys with zero counters. Registration challenges are also consumed once; the existing setup secret remains required.
- Firestore-backed per-IP limits apply independently of browser storage: Telegram 5 requests/10 minutes, authentication 30/10 minutes, polling 180/minute. Telegram additionally has a global 12/hour notification limit. Logout is not throttled.
- Webhook handling fails closed if its secret is missing; sender allowlisting remains in place. Production secret presence was checked without retrieving its value.
- State-changing auth actions require same-origin POST. Errors avoid returning backend details.
- After fresh Firebase sign-in, both admin claims are checked, then the server issues an eight-hour Secure, HttpOnly, SameSite=Strict admin session cookie. `/admin` and `/admin.html` are served through verified session-cookie handling. Admin HTML is excluded from static output and bundled privately with the function; it is never cached.
- Dashboard Firebase listeners still require admin claims. Firebase client authentication remains necessary for existing Firestore access; the new HttpOnly cookie gates the HTML and does not replace the Firestore security rules. Browser storage markers grant no authorization.
- Gateway analytics/tracker, inline scripts/styles, icon CDN and remote fonts were removed. WebAuthn browser 13.3.0 is vendored with its license. Gateway-specific CSP restricts scripts and connections. Start bridge preserves origin/source checking and its return-origin allowlist.

Server-only collections: `gateway_limits`, `gateway_challenges`, `gateway_credentials`, and existing `auth_requests`. The existing Firestore default-deny rules exclude browser access. Expiry is checked in application transactions; this release does not configure database TTL cleanup.

## Validation

`npm run quality`: tests, TypeScript, JavaScript syntax and full production build. Regression tests cover expired/missing-expiry approvals, wrong-browser access, concurrent one-time consumption, challenge expiry/replay, persistent counters, CSRF/method rejection, secure cookies, non-admin/stale sessions, protected admin HTML and static-output exclusion.

Isolated Chromium at 320×568, 390×844, 768×1024, 1024×768, 1440×900, 1920×1080, 2560×1440, 844×390 and 720×450 checks layout and horizontal overflow. Mocked auth verifies no automatic Telegram notification, cancellation/fallback, denial/retry, non-admin rejection, successful animation/redirect, motion pause/reduced motion, and the gateway CSP. Live biometric/Telegram approvals require the account holder and are not simulated against production.

One main ref update triggers the existing production hosting integration. No intermediate branch push or manual deployment is required.

## Balanced visual revision — November 5

Only presentation CSS, labels and these notes change. The existing `wall-v2.webp` asset is displayed at low opacity and in grayscale, cropped to exclude the outer edge bolts. No new raster asset or runtime dependency is introduced. Nine responsive viewport checks cover idle and code states, passkey cancellation, Telegram fallback and denial, successful redirects, pause/reduced motion, and CSP. Authentication responses in browser checks are mocked; no real Telegram approval messages are sent.
