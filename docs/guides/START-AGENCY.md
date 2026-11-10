# Startpage agency workspace

The Startpage at `https://start.omeryigitler.com` remains the entry point. Its
Taurus standby, command bar, folders, notes and History workspace are retained.
The Agency module opens `/#agency/overview`; individual sections use the same hash
route. Direct legacy admin visits open this workspace after Gateway verification.

## Integration

Sales, Studio and AI controls use the existing `/api/agent` function's `studio-*`
actions. They reuse the secure host-only Gateway session cookie. The API checks
revocation and both `admin === true` and `role === 'admin'`, applies an exact
Startpage/portfolio Origin allowlist, and allows credentialed CORS only from the
production Startpage. Cookie-authenticated writes without Origin are rejected.
No provider keys or identity tokens are returned to the browser.

Projects, Clients, Proposals, Pricing, Inbox and the original world/globe screen
retain their existing admin modules inside a single lazy authenticated iframe.
Only the production Startpage and the same origin are allowed by `frame-ancestors`.
The navigation bridge verifies the referring origin, sender origin and source
window. Its messages contain only readiness and allowlisted view names. It waits
for the admin claim check before signaling readiness. An expired session offers
a top-level Gateway renewal with a return to the selected section.

## Agency records and execution

`studio_prospects`, `studio_jobs`, `studio_audit`, `studio_config`, and bounded
AI accounting collections are server-only under the existing default-deny rules.
Domain deduplication retains the prospect's sales stage. Contacted requires
explicit confirmation of manual contact. Job submission is idempotent and jobs
remain paused until an execution service exists. No research, code generation,
deployment, outbound contact, or paid-model execution is automated by this change.

AI controls apply to existing daily chat, classification and Telegram model calls.
Missing or expired verified-free provider configuration blocks external models;
deterministic admin tools keep working. FREE/HYBRID does not activate paid usage.
Settings and API responses never include a provider key. Existing environment
values, Passkeys, Telegram credentials and Firebase rules are unchanged.

Preview Studio access/execution remains blocked unless an isolated backend has
been explicitly configured. Production Startpage is the only cross-origin host;
preview domains are intentionally not added to the trust boundary.

## Validation

- 80 backend/security tests pass, including spoofed navigation, strict admin
  claims, revoked sessions, CORS, free-only accounting and idempotent CRM writes.
- Portfolio `npm run quality` and Startpage production build pass.
- 111 public built files match the current main baseline byte for byte; only
  admin-only generated assets and the two integration assets are excluded.
- Credential pattern scans return no findings in either project's frontend.
- Managed local browser preview could not launch Next.js because the supplied
  preview service adds unsupported Vite CLI options. Browser layout, actual device
  Passkey and live authenticated persistence are not certified by local checks.

Release order: portfolio backend first, then Startpage. One production release per
repository is sufficient; do not redeploy separately after an automatic Git build.
