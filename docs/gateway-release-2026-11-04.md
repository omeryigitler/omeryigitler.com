# Taurus Gateway release — responsive presentation and access hardening

The approved scope is a full-viewport photographic Taurus vault with restrained continuous yellow conduit flow, responsive controls, and security ahead of decorative effects. The public homepage is unchanged. The existing reference artwork supplies separate masked wall, door and emblem layers; a local SVG adds subtle wall conduits. The emblem stays stationary while the door opens. The success transition lasts 2.7 seconds and is skipped for reduced motion. Users can pause ambient animation; hidden tabs also pause it. Short/narrow screens may scroll to keep controls readable.

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
