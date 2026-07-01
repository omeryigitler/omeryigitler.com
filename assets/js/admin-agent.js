(() => {
  if (!/admin\.html$/.test(window.location.pathname)) return;

  const state = {
    open: false,
    busy: false,
    approvals: []
  };

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value);
    });
    children.forEach((child) => node.appendChild(typeof child === "string" ? document.createTextNode(child) : child));
    return node;
  }

  function styles() {
    const css = `
      #agent-launcher { position: fixed; right: 22px; bottom: 22px; z-index: 180; }
      #agent-launcher button { border: 1px solid rgba(255,215,0,.45); background: #FFD700; color: #050505; border-radius: 999px; padding: 14px 18px; font: 900 11px JetBrains Mono, monospace; letter-spacing: .18em; box-shadow: 0 0 28px rgba(255,215,0,.22); }
      #agent-panel { position: fixed; inset: 0; z-index: 190; display: none; align-items: center; justify-content: center; padding: 18px; background: rgba(0,0,0,.76); backdrop-filter: blur(18px); }
      #agent-panel.open { display: flex; }
      .agent-card { width: min(860px, 100%); max-height: 88vh; overflow: hidden; border: 1px solid rgba(255,255,255,.12); border-radius: 28px; background: rgba(8,8,8,.96); box-shadow: 0 32px 80px rgba(0,0,0,.55); }
      .agent-head, .agent-foot { padding: 22px; border-bottom: 1px solid rgba(255,255,255,.08); display: flex; align-items: center; justify-content: space-between; gap: 14px; }
      .agent-foot { border-top: 1px solid rgba(255,255,255,.08); border-bottom: 0; justify-content: flex-end; }
      .agent-body { padding: 22px; overflow-y: auto; max-height: 62vh; display: grid; gap: 16px; }
      .agent-title { color: #fff; font: 900 14px JetBrains Mono, monospace; letter-spacing: .2em; text-transform: uppercase; }
      .agent-sub { color: #777; font: 700 10px JetBrains Mono, monospace; letter-spacing: .14em; margin-top: 6px; }
      .agent-textarea { width: 100%; min-height: 110px; border-radius: 18px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); color: #fff; padding: 16px; outline: 0; resize: vertical; font: 500 13px Manrope, sans-serif; }
      .agent-button { border: 1px solid rgba(255,215,0,.36); background: rgba(255,215,0,.12); color: #FFD700; border-radius: 14px; padding: 12px 14px; font: 900 10px JetBrains Mono, monospace; letter-spacing: .16em; text-transform: uppercase; }
      .agent-button.primary { background: #FFD700; color: #050505; }
      .agent-button.danger { border-color: rgba(239,68,68,.35); background: rgba(239,68,68,.1); color: #ef4444; }
      .agent-box { border: 1px solid rgba(255,255,255,.08); border-radius: 18px; background: rgba(255,255,255,.035); padding: 16px; }
      .agent-box h4 { color: #FFD700; font: 900 11px JetBrains Mono, monospace; letter-spacing: .16em; text-transform: uppercase; margin: 0 0 10px; }
      .agent-box pre { white-space: pre-wrap; word-break: break-word; color: #d4d4d4; font: 500 12px JetBrains Mono, monospace; margin: 0; }
      .agent-approval { border: 1px solid rgba(255,215,0,.18); border-radius: 18px; padding: 14px; background: rgba(255,215,0,.05); display: grid; gap: 12px; }
      .agent-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    `;
    document.head.appendChild(el("style", { text: css }));
  }

  async function token() {
    const user = window.firebase?.auth?.().currentUser;
    if (!user) throw new Error("Firebase admin session is not ready.");
    return user.getIdToken();
  }

  async function api(path, options = {}) {
    const idToken = await token();
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.error || `Request failed (${response.status})`);
    return payload;
  }

  function setOutput(title, value) {
    const output = document.getElementById("agent-output");
    if (!output) return;
    output.innerHTML = "";
    output.appendChild(el("h4", { text: title }));
    output.appendChild(el("pre", { text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }));
  }

  async function sendCommand() {
    const input = document.getElementById("agent-command-input");
    const text = input?.value?.trim();
    if (!text) return setOutput("Missing Command", "Write a command first.");
    state.busy = true;
    setOutput("Running", "Reading latest lead and preparing an approval draft...");
    try {
      const result = await api("/api/agent?action=command", {
        method: "POST",
        body: JSON.stringify({ text, source: "admin_panel" })
      });
      setOutput("Agent Result", result);
      await loadApprovals();
    } catch (error) {
      setOutput("Agent Error", error.message);
    } finally {
      state.busy = false;
    }
  }

  async function loadApprovals() {
    const list = document.getElementById("agent-approvals");
    if (!list) return;
    list.innerHTML = "";
    try {
      const result = await api("/api/agent?action=status", { method: "GET" });
      state.approvals = result.approvals || [];
      if (!state.approvals.length) {
        list.appendChild(el("div", { class: "agent-box" }, [el("pre", { text: "No pending approvals." })]));
        return;
      }
      state.approvals.forEach((approval) => renderApproval(list, approval));
    } catch (error) {
      list.appendChild(el("div", { class: "agent-box" }, [el("pre", { text: error.message })]));
    }
  }

  function renderApproval(list, approval) {
    const payload = approval.payloadPreview || {};
    const card = el("div", { class: "agent-approval" });
    card.appendChild(el("div", { class: "agent-title", text: `${approval.requestedAction || "ACTION"} // ${approval.risk || "medium"}` }));
    card.appendChild(el("pre", { text: JSON.stringify(payload, null, 2) }));
    const actions = el("div", { class: "agent-actions" });
    actions.appendChild(el("button", { class: "agent-button primary", text: "Approve", onclick: () => decide(approval.id, "approve") }));
    actions.appendChild(el("button", { class: "agent-button danger", text: "Reject", onclick: () => decide(approval.id, "reject") }));
    card.appendChild(actions);
    list.appendChild(card);
  }

  async function decide(approvalId, decision) {
    try {
      const confirmed = await window.systemConfirm?.("AGENT APPROVAL", `${decision.toUpperCase()} this pending agent action?`, "shield-check");
      if (confirmed === false) return;
      const result = await api("/api/agent?action=approve", {
        method: "POST",
        body: JSON.stringify({ approvalId, decision })
      });
      setOutput("Approval Result", result);
      await loadApprovals();
    } catch (error) {
      setOutput("Approval Error", error.message);
    }
  }

  function mount() {
    styles();
    const launcher = el("div", { id: "agent-launcher" }, [
      el("button", { text: "AGENT", onclick: () => panel.classList.add("open") })
    ]);
    const panel = el("div", { id: "agent-panel" });
    panel.appendChild(el("div", { class: "agent-card" }, [
      el("div", { class: "agent-head" }, [
        el("div", {}, [el("div", { class: "agent-title", text: "$ AGENT COMMAND" }), el("div", { class: "agent-sub", text: "READ → PROPOSE → APPROVE" })]),
        el("button", { class: "agent-button", text: "Close", onclick: () => panel.classList.remove("open") })
      ]),
      el("div", { class: "agent-body" }, [
        el("textarea", { id: "agent-command-input", class: "agent-textarea", placeholder: "Son gelen mesajı özetle ve teklif taslağı hazırla" }),
        el("div", { class: "agent-actions" }, [
          el("button", { class: "agent-button primary", text: "Run Agent", onclick: sendCommand }),
          el("button", { class: "agent-button", text: "Refresh Approvals", onclick: loadApprovals })
        ]),
        el("div", { id: "agent-output", class: "agent-box" }, [el("h4", { text: "Output" }), el("pre", { text: "Agent ready." })]),
        el("div", { class: "agent-box" }, [el("h4", { text: "Pending Approvals" }), el("div", { id: "agent-approvals" })])
      ])
    ]));
    document.body.appendChild(launcher);
    document.body.appendChild(panel);
    loadApprovals();
  }

  window.addEventListener("load", () => setTimeout(mount, 500));
})();
