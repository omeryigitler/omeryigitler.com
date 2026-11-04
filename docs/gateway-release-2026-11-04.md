# Taurus Gateway release

The November 2 request calls for the supplied photographic vault in a full-screen layout, yellow light moving through the conduits, a stationary viewport-centred Taurus emblem and an opening sequence lasting 2–3 seconds. Passkey, Telegram and the Start bridge remain supported.

PR #70 supplied the reference artwork and live controls, but constrained the artwork to a portrait card and only pulsed its shadow after authentication. This release reuses that artwork as independently masked wall, door and emblem layers. Light travels for 0.85 seconds; the door opens after 0.9 seconds; navigation follows at 2.7 seconds. Reduced-motion users navigate without the animation. The public homepage is unchanged.

Security changes:
- Gateway verifies both admin claims after Firebase custom-token sign-in before starting the success sequence.
- Dashboard listeners require verified admin claims; an anonymous user or storage marker alone is insufficient.
- Telegram approvals with expired or absent expiration timestamps cannot mint an admin token.
- Malformed local lockout data no longer breaks initialization, and a failed Telegram initialization can be retried.

Validation: existing quality suite, TypeScript, JavaScript syntax checks and production build; behavioral tests for expired/valid Telegram approval and admin/non-admin dashboard initialization. Isolated Chromium checks at 1440×900, 390×844, 320×568 and 844×390 verify viewport-centred logo, visible controls and no horizontal overflow. Mocked authentication covers passkey cancellation, Telegram fallback/code display, unauthorized token rejection, authorized opening/redirect and reduced-motion redirect. Start bridge source retains same-origin/source validation, fresh admin token checks and its return-origin allowlist. Live biometric and Telegram approvals require the account holder and were not exercised.

Release uses one main ref update and the existing hosting Git integrations, with no manually triggered deployment or intermediate branch push.
