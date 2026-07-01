# Agent Operations

## Scope

The production Agent is a private, deterministic operations assistant for the authenticated admin panel and allowlisted Telegram account. It does not use an LLM to decide whether a privileged write is allowed.

Supported read commands:

- Latest lead summary
- Today's or unread message summary
- Active project summary
- Recent visitor summary without raw IP data

Supported write requests:

- Create a draft quote from the latest lead
- Dispatch `FREEZE`, `CLEAR`, `ALARM`, or `BLOCK` to a visitor session

Every write request creates an `agent_approvals` record first. The write runs only after an authorized operator explicitly approves it in the admin panel or Telegram.

## Example commands

```text
Son gelen lead kim?
Bugünkü mesajları özetle.
Okunmamış leadleri listele.
Aktif projeleri listele.
Son ziyaretçileri özetle.
Son gelen mesajı özetle ve teklif taslağı hazırla.
Son ziyaretçiyi dondur ve bakımdayız yaz.
```

## API

`/api/agent` accepts these actions:

- `GET ?action=status` — capabilities, pending approvals, and the last 10 runs
- `POST ?action=command` — validated operational text command
- `POST ?action=visitor` — explicit visitor-control approval request
- `POST ?action=approve` — explicit approve/reject decision

Admin requests require a verified Firebase ID token and an admin claim or configured UID/email allowlist. Server-to-server requests may use `AGENT_API_SECRET`.

## Telegram

The Telegram webhook routes supported text commands directly to the deterministic Agent. Gemini is used only to classify/transcribe voice input or understand visitor-control wording that the strict parser cannot match.

Visitor controls and proposal creation are never executed directly from Telegram. Telegram receives approve/reject buttons tied to the same Firestore approval record shown in the admin panel.

Production must define `TELEGRAM_WEBHOOK_SECRET`, and the same value must be configured as Telegram's webhook `secret_token`. The webhook fails closed when the secret header is absent or incorrect.

## Firestore collections

- `agent_commands` — normalized command and lifecycle
- `agent_runs` — tool calls, status, and summary
- `agent_approvals` — immutable write preview and operator decision
- `agent_audit_logs` — read/write audit trail
- `messages`, `projects`, `visitors_v1` — read tools
- `quotes`, `clients`, `messages`, `visitors_v1` — approved transaction targets

Quote creation and visitor command dispatch are transaction-backed and idempotent at the approval level.

## Deployment checklist

1. Run `npm run quality`.
2. Confirm no secret value appears in the diff.
3. Configure `TELEGRAM_WEBHOOK_SECRET` for Preview and Production before merging.
4. Revoke the Gemini key previously committed in `elitebody/services/geminiService.ts`; the code fallback has been removed, but Git history still contains the old value.
5. Configure a separate Preview Firebase service account; never copy the Production private key into Preview.
6. Exercise read commands in Preview.
7. Create and reject one proposal approval.
8. Create and reject one visitor command approval.
9. After manual merge, repeat status/read smoke tests in Production.

Production-changing approval tests should use a controlled test lead/session and an operator-confirmed window.
