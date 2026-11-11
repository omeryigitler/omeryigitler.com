# Agency Continue workflow

Studio prepares business-specific work; the owner builds the actual final website.

1. Sales → choose market/industry → **Find & research**. The existing bounded OpenStreetMap discovery creates up to three deduplicated companies. With verified free AI, the UI requests research sequentially.
2. Studio → review sources, observations, opportunities and unknowns. Confirm the real business recipient, its source and actual contact basis.
3. **Continue · prepare proposal** creates a tailored scope. The server calculates its price with shared Pricing rules, then saves a quote and PDF.
4. Review From, To, Reply to, subject, full text and attachments. **Continue · send proposal** approves precisely that payload.
5. AI prepares a specific structured design: copy, sections, palette, typography and layout. Studio renders a script-free responsive HTML concept and PDF.
6. Review the design and follow-up email. **Continue · send concept** sends its immutable files, then links an active project at proposal stage. Client decision remains pending; progress is zero and final approval is false.
7. The owner agrees final scope/content, builds the website, connects forms/domain, tests and launches.

Closing the view stops remaining client-driven preparation requests; already-started work may finish and checkpoint. Reopen and Continue to resume. This is not an unattended scheduled worker and creates no public demo deployment.

## Connections

The existing Gemini server credential is never returned to the browser. In **AI controls**, the owner checks that same key's project in Google AI Studio and confirms it uses the free plan with billing disabled. This explicit owner attestation expires after seven days and is bound to the server key. It is not an automated Google billing audit. Expiry or key rotation blocks model calls. Existing server-side free verification is preserved.

Only `gemini-2.5-flash-lite` is supported by the new assistant. Google's Standard pricing table reviewed on 2026-11-11 lists free text generation and up to 500 grounded requests/day shared with Flash. Existing server request/concurrency limits still apply; no paid fallback is enabled.

First-contact email requires a work mailbox. Configure these server environment variables with the mailbox provider's official settings:

| Variable | Meaning |
| --- | --- |
| `STUDIO_SMTP_HOST` | SMTP hostname |
| `STUDIO_SMTP_PORT` | 465 (TLS) or 587 (required STARTTLS) |
| `STUDIO_SMTP_USER` | Mailbox username |
| `STUDIO_SMTP_PASS` | Server-only app password/SMTP credential |
| `STUDIO_MAIL_FROM` | Authorized branded sender |
| `STUDIO_MAIL_REPLY_TO` | Optional reply address; existing contact recipient is the fallback |

The panel exposes presence and sender identity only. Keep credentials on the server, outside chat and source control.

Existing Resend configuration is used only for requested/permitted messages. Resend prohibits cold outreach and scraped-contact campaigns. First business contact always selects SMTP and never falls back to Resend. Choose the real contact basis rather than changing it to bypass a missing connection.

## Recovery and storage

- `studio_workflows/{prospectId}` stores one versioned workflow per company, durable results, short leases and action replay protection.
- `studio_workflow_files` stores immutable files prepared before email review. PDF retries reuse saved AI output. Downloads require the existing management session; no public capability URLs are created.
- `studio_outbox/{prospectId}_{proposal|concept}` binds approval to the sender, recipient, text and attachment hashes, records attempts and saves provider acceptance before progression.
- Ten new emails/day; at most three attempts/message. Resend retries reuse identical saved bytes and the same idempotency key for at most 23 hours, before its 24-hour duplicate-protection expiry.
- SMTP has no exactly-once guarantee after an ambiguous network failure. Unknown or interrupted sends block retries. The owner checks the exact subject/recipient in Sent, then explicitly records an existing send. Unknown is never displayed as sent.
- Emergency stop is checked before preparation and sending. An external request already in flight may finish.
- All endpoints retain Gateway authentication, exact-origin policy and isolated-preview guards. New collections remain server-only under existing default-deny rules.

## Verification

The workflow tests exercise the complete chain with isolated model/mail dependencies, exact-payload approval, duplicate/concurrent actions, PDF/checkpoint recovery, unknown delivery, idempotency expiry, free-project confirmation and private files. Existing authorization tests cover all new actions.

Browser QA completed research review → proposal → concept → owner handoff, refreshed a saved review and downloaded a real Chromium-generated PDF using labelled fixtures. No real company emails were sent, and production billing was not attested by the development agent.

References: [Gemini pricing](https://aistudio.google.com/docs/pricing#gemini-2.5-flash-lite), [grounding](https://aistudio.google.com/docs/google-search), [Resend acceptable use](https://resend.com/legal/acceptable-use), [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys), [SMTP](https://nodemailer.com/smtp).
