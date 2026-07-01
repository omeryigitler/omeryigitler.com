# AGENTS.md — omeryigitler.com Agent Project Specification

This file defines how AI agents should understand, modify, operate, and extend the `omeryigitler.com` codebase.

The goal is to evolve the current website/admin dashboard into a controlled private agent system that can assist with admin operations first, and later create or update websites through GitHub branches, preview deploys, and explicit approval.

---

## 1. Repository profile

- Repository: `omeryigitler/omeryigitler.com`
- Default branch: `main`
- Deployment target: Vercel
- Frontend style: mostly static HTML/CSS/JS, with selected React islands built by Vite
- API style: Vercel Serverless Functions under `/api`
- Data layer: Firebase / Firestore
- Admin area: `admin.html`
- Gateway/security area: `gateway.html`, `passkey-setup.html`, Telegram challenge flow
- Existing AI/command entry point: `api/webhook.js`
- Existing PDF generation endpoint: `api/pdf.js`
- Existing Instagram endpoint: `api/instagram.js`

---

## 2. Current architecture observations

### 2.1 Build system

The project uses Vite for React islands and Tailwind for CSS generation.

Current build scripts:

```json
{
  "dev": "vite --host 0.0.0.0",
  "build:react": "vite build",
  "build:css": "npx tailwindcss -i ./src/input.css -o ./assets/css/styles.css --minify",
  "prepare:instagram": "node scripts/wire-instagram.js",
  "build": "npm run prepare:instagram && npm run build:react && npm run build:css"
}
```

Agent changes must preserve this build flow unless the task explicitly asks for a build-system migration.

### 2.2 React island pattern

React is not currently the full app shell. `src/react/main.tsx` mounts specific sections into existing DOM nodes. Agents must not assume a full SPA architecture.

Current React entry points:

- `#expertise`
- `#build-process-react-root`

### 2.3 Serverless API pattern

The project already uses Vercel serverless functions. Sensitive server-side work should be implemented under `/api`, not directly in browser code.

Current important APIs:

- `/api/webhook` — Telegram webhook, Gemini command classification, visitor command routing
- `/api/pdf` — server-side PDF rendering with Puppeteer/Chromium
- `/api/instagram` — Instagram Basic Display/Graph media fetch proxy

### 2.4 Admin panel pattern

`admin.html` currently contains a large amount of inline UI, state, Firebase client logic, realtime listeners, workflow automation, and modal behavior.

Agents must treat `admin.html` as high-risk because it combines:

- Authentication guard
- Firestore realtime reads/writes
- Message inbox
- Client management
- Quote/proposal management
- Project management
- Visitor intelligence
- PDF workflow
- Telegram settings UI
- Auto-pipeline behavior

Any large admin change should be staged behind a branch and preferably split into smaller JS modules instead of adding more inline script.

---

## 3. Agent system goal

The target is a private operational agent system for `omeryigitler.com`.

The agent should eventually support:

1. Admin questions
   - "Bugünkü mesajları özetle."
   - "Son gelen lead kim?"
   - "Projelerde bekleyen iş var mı?"

2. Admin actions
   - Draft quote creation
   - Draft project creation
   - PDF generation request
   - Visitor intelligence summary
   - Visitor command dispatch only when approved

3. Telegram control
   - Continue supporting voice/text commands
   - Route non-visitor-control commands into a broader agent command queue

4. Website builder workflow
   - Create branch
   - Modify files
   - Open PR
   - Wait for preview/deploy checks
   - Require manual approval before merge

The agent must never directly mutate production-critical data or push directly to `main` without an explicit approved workflow.

---

## 4. Agent architecture

Recommended architecture:

```text
Admin Panel / Telegram
        |
        v
/api/agent/command
        |
        v
Agent Orchestrator
        |
        +--> Firestore tools
        +--> Visitor tools
        +--> Quote/project tools
        +--> PDF tools
        +--> GitHub builder tools
        +--> Telegram response tools
        |
        v
Firestore audit + approvals
```

### 4.1 Frontend responsibilities

The browser/admin panel should only:

- Capture written or voice command text
- Display agent responses
- Show pending approvals
- Trigger explicit approve/reject actions
- Render command history and audit logs

The browser/admin panel should not:

- Hold secret keys
- Call Gemini/OpenAI directly
- Call Telegram Bot API directly
- Execute privileged Firestore writes without server-side validation
- Automatically run destructive or production-changing actions

### 4.2 Backend responsibilities

Serverless API functions should:

- Verify admin identity
- Verify Telegram sender identity
- Classify intent
- Create agent run records
- Execute allowed tools
- Require approval for risky tools
- Write audit logs
- Return concise results

### 4.3 Firestore responsibilities

Firestore should store:

- Commands
- Runs
- Tool calls
- Approval requests
- Audit log entries
- Agent memories scoped to project operations

Firestore should not store plaintext API secrets.

---

## 5. Proposed files and directories

Future agent implementation should use this structure:

```text
/api/
  agent/
    command.js              # Main admin-panel command endpoint
    telegram.js             # Optional future Telegram agent router
    approve.js              # Approval decision endpoint
    status.js               # Agent run status endpoint
  agent-core/
    orchestrator.js         # Intent routing and tool execution
    policy.js               # Risk levels and permission checks
    schemas.js              # JSON schemas for agent inputs/outputs
    audit.js                # Audit logging helpers
    firebase.js             # Server-side Firebase helpers or wrappers
    tools/
      messages.js           # Inbox/message tools
      clients.js            # Client tools
      quotes.js             # Quote/proposal tools
      projects.js           # Project tools
      visitors.js           # Visitor intelligence/control tools
      pdf.js                # PDF generation wrapper
      github.js             # Future branch/PR tools
      telegram.js           # Telegram response wrapper
/assets/js/
  admin-agent.js            # Agent modal frontend bridge
/docs/
  agent-architecture.md     # Expanded human documentation
```

Initial implementation may start with fewer files, but agents must avoid further growing `admin.html` with large inline logic.

---

## 6. Firestore schema

### 6.1 `agent_commands`

Each user instruction becomes a command record.

```js
{
  source: "admin_panel" | "telegram" | "system",
  text: string,
  normalizedIntent: string | null,
  status: "queued" | "running" | "waiting_approval" | "completed" | "failed" | "rejected",
  createdAt: Timestamp,
  createdBy: string,
  approvedBy: string | null,
  relatedRunId: string | null,
  risk: "low" | "medium" | "high" | "critical"
}
```

### 6.2 `agent_runs`

One command can create one or more run records.

```js
{
  commandId: string,
  status: "running" | "completed" | "failed" | "waiting_approval",
  model: string,
  startedAt: Timestamp,
  completedAt: Timestamp | null,
  summary: string | null,
  error: string | null,
  toolCalls: [
    {
      name: string,
      input: object,
      outputSummary: string,
      status: "success" | "failed" | "skipped",
      at: Timestamp
    }
  ]
}
```

### 6.3 `agent_approvals`

Risky operations must create approval records.

```js
{
  commandId: string,
  runId: string,
  requestedAction: string,
  risk: "medium" | "high" | "critical",
  payloadPreview: object,
  status: "pending" | "approved" | "rejected" | "expired",
  requestedAt: Timestamp,
  decidedAt: Timestamp | null,
  decidedBy: string | null
}
```

### 6.4 `agent_audit_logs`

Every meaningful action should be auditable.

```js
{
  actor: string,
  source: "admin_panel" | "telegram" | "api" | "system",
  action: string,
  targetType: string,
  targetId: string | null,
  risk: "low" | "medium" | "high" | "critical",
  result: "success" | "failed" | "blocked" | "requires_approval",
  message: string,
  createdAt: Timestamp
}
```

---

## 7. Tool risk policy

### 7.1 Low risk — can run immediately

- Read unread messages
- Summarize recent leads
- Summarize clients
- Summarize active projects
- Summarize visitor intelligence
- Read quote/project metadata
- Explain current site architecture

### 7.2 Medium risk — approval recommended

- Create draft quote
- Create draft project
- Generate PDF
- Mark message as read
- Update project notes
- Send Telegram status message to admin

### 7.3 High risk — approval required

- Delete messages
- Delete clients
- Delete quotes
- Delete projects
- Visitor `freeze`, `block`, `alarm`, `clear` commands
- Change security settings
- Change pricing config
- Trigger deploy
- Open a GitHub pull request

### 7.4 Critical risk — explicit manual approval and branch required

- Push to `main`
- Merge pull request
- Modify auth/gateway logic
- Modify Firebase rules
- Rotate or write secrets
- Disable admin security checks
- Change Vercel production settings

---

## 8. Agent command examples

### 8.1 Read-only command

User:

```text
Bugünkü leadleri özetle.
```

Expected behavior:

1. Read `messages` from today.
2. Exclude system/report messages.
3. Return concise Turkish summary.
4. Write an `agent_audit_logs` entry with `risk: low`.

### 8.2 Draft creation command

User:

```text
Son gelen mesajdan teklif taslağı oluştur.
```

Expected behavior:

1. Find latest non-system message.
2. Build quote request using existing pricing logic.
3. Create draft quote only after checking duplication.
4. Link quote to message.
5. Return quote number and project context.
6. Log the action.

### 8.3 Visitor-control command

User:

```text
Son ziyaretçiyi dondur ve ekrana bakımdayız yaz.
```

Expected behavior:

1. Classify as visitor-control action.
2. Create `agent_approvals` record with `risk: high`.
3. Do not execute until approved.
4. After approval, write action to `visitors_v1`.
5. Log both approval and execution.

### 8.4 Builder command

User:

```text
Ana sayfadaki Instagram bölümünü daha hızlı yap.
```

Expected behavior:

1. Create a new GitHub branch.
2. Modify only relevant files.
3. Run build/checks if available.
4. Open draft PR.
5. Wait for human review.
6. Never merge automatically.

---

## 9. Existing webhook integration notes

`api/webhook.js` already includes a strong starting point:

- Telegram sender allowlist via environment variables
- Optional Telegram webhook secret header validation
- Gemini-based command classification
- Fallback parser for Turkish/English visitor commands
- Visitor command writes to `visitors_v1`
- Telegram auth callback handling for gateway access

Future work should not replace this blindly. Instead:

1. Extract visitor-control intent classification into `api/agent-core/tools/visitors.js`.
2. Keep webhook compatibility.
3. Route broader non-visitor Telegram commands to `/api/agent/command`.
4. Add approval records for high-risk visitor commands unless the command comes from an explicitly trusted emergency path.

---

## 10. Security rules for agents

Agents must follow these rules:

1. Never expose secrets in frontend files.
2. Never write Telegram bot tokens, Firebase private keys, Gemini keys, Instagram tokens, or Vercel tokens into committed code.
3. Use environment variables for all secrets.
4. Do not weaken authentication logic.
5. Do not add admin bypasses based on `localStorage` or `sessionStorage` alone.
6. Do not create Firestore writes from client code for privileged actions when a server-side API is available.
7. Always prefer server-side Firebase Admin SDK for privileged operations.
8. Always log privileged actions.
9. Always require approval for destructive operations.
10. Always use a branch for code changes.

---

## 11. Performance rules for agents

Agents modifying the site should protect performance:

1. Do not add more long inline scripts to `admin.html`.
2. Avoid starting multiple `onSnapshot` listeners for the same collection.
3. Avoid Firestore writes inside snapshot loops.
4. Only activate realtime listeners for the active admin tab when possible.
5. Lazy-load heavy visual modules such as globe, pricing iframe, and PDF workflow.
6. Respect `prefers-reduced-motion`.
7. Avoid adding new global animations to mobile without a reduced-motion fallback.
8. Keep public homepage JS small.
9. Keep serverless functions focused and time-bounded.
10. Cache external API responses when safe.

---

## 12. GitHub workflow rules

All code-changing agents must use this workflow:

```text
main
  |
  +--> agent/<short-task-name>
          |
          +--> commit changes
          +--> open draft PR
          +--> preview deploy/checks
          +--> human review
          +--> manual merge
```

Branch naming examples:

- `agent/admin-agent-modal`
- `agent/firestore-command-queue`
- `agent/visitor-approval-flow`
- `agent/github-builder-tools`
- `agent/perf-admin-listeners`

Commit message examples:

- `docs: add agent project specification`
- `feat(agent): add command queue endpoint`
- `feat(admin): add agent modal shell`
- `refactor(admin): split messages module`
- `fix(security): route telegram test through server`

---

## 13. Implementation phases

### Phase 1 — Documentation and safety baseline

- Add this `AGENTS.md` file.
- Confirm no secrets exist in committed frontend code.
- Rotate any previously exposed Telegram bot token.
- Document current admin and webhook architecture.

### Phase 2 — Server-side command queue

Add:

- `/api/agent/command.js`
- `/api/agent/status.js`
- `/api/agent/approve.js`
- `api/agent-core/orchestrator.js`
- `api/agent-core/policy.js`
- `api/agent-core/audit.js`

Minimum tools:

- `messages.getLatest`
- `messages.summarizeUnread`
- `projects.listActive`
- `quotes.createDraft`
- `visitors.summarizeLatest`

### Phase 3 — Admin panel agent modal

Add `assets/js/admin-agent.js` and a compact modal shell in `admin.html`.

Modal features:

- Command input
- Response panel
- Pending approval cards
- Last 10 agent runs
- Safe loading states

### Phase 4 — Telegram agent routing

Extend `api/webhook.js` so non-visitor-control commands can be passed to the agent orchestrator.

Visitor-control commands should remain supported, but approval policy should be introduced before broadening capability.

### Phase 5 — Builder agent

Add GitHub/Vercel workflow tools.

Allowed first operations:

- Read repo files
- Create branch
- Update non-critical files
- Open draft PR

Disallowed without human approval:

- Merge PR
- Push to main
- Modify auth/security files
- Modify secrets/deploy settings

---

## 14. First implementation target

The first real implementation should be narrow:

```text
Admin asks: "Son gelen mesajı özetle ve teklif taslağı öner."
```

The agent should:

1. Read the latest non-system message.
2. Summarize the customer need.
3. Suggest a quote configuration.
4. Ask for approval before writing a quote.
5. If approved, create a draft quote and log it.

This gives a useful agent without immediately risking destructive actions or code generation.

---

## 15. Definition of done

The agent project is acceptable when:

- All privileged commands run server-side.
- All risky commands require approval.
- All tool calls are logged.
- Admin panel can show command status.
- Telegram can route supported commands safely.
- No secrets are committed.
- No code-changing agent pushes directly to `main`.
- Build still passes with the existing `npm run build` flow.

---

## 16. Agent behavior standard

When acting on this repository, an AI agent must:

1. Inspect existing files before editing.
2. Make the smallest useful change.
3. Preserve the visual identity of the site.
4. Use branch-based changes.
5. Avoid speculative rewrites.
6. Explain risk when touching auth, Firebase, Telegram, Vercel, or payment/pricing logic.
7. Prefer modular JS/API files over more inline admin code.
8. Keep Turkish admin/operator UX where the existing panel uses Turkish or Turkish-English operational language.
9. Keep public-facing copy polished and English unless the surrounding section is Turkish.
10. Stop and request human approval before critical actions.
