(() => {
  if (!/admin\.html$/.test(window.location.pathname)) return;

  const state = {
    mounted: false,
    busy: false,
    approvals: [],
    lastFocus: null
  };

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
      else if (value !== null && value !== undefined) node.setAttribute(key, String(value));
    });
    children.forEach((child) => node.appendChild(typeof child === "string" ? document.createTextNode(child) : child));
    return node;
  }

  function installStyles() {
    if (document.getElementById("agent-styles")) return;
    const css = `
      #agent-launcher { position: fixed; right: 22px; bottom: 22px; z-index: 180; }
      #agent-launcher button { border: 1px solid rgba(255,215,0,.45); background: #FFD700; color: #050505; border-radius: 999px; padding: 14px 18px; font: 900 11px JetBrains Mono, monospace; letter-spacing: .18em; box-shadow: 0 0 28px rgba(255,215,0,.22); cursor: pointer; }
      #agent-panel { position: fixed; inset: 0; z-index: 190; display: none; align-items: center; justify-content: center; padding: 18px; background: rgba(0,0,0,.76); backdrop-filter: blur(18px); }
      #agent-panel.open { display: flex; }
      .agent-card { width: min(860px, 100%); max-height: 88vh; overflow: hidden; border: 1px solid rgba(255,255,255,.12); border-radius: 28px; background: rgba(8,8,8,.98); box-shadow: 0 32px 80px rgba(0,0,0,.55); }
      .agent-head { padding: 22px; border-bottom: 1px solid rgba(255,255,255,.08); display: flex; align-items: center; justify-content: space-between; gap: 14px; }
      .agent-body { padding: 22px; overflow-y: auto; max-height: 70vh; display: grid; gap: 16px; }
      .agent-title { color: #fff; font: 900 14px JetBrains Mono, monospace; letter-spacing: .18em; text-transform: uppercase; }
      .agent-sub { color: #8b8b8b; font: 700 10px JetBrains Mono, monospace; letter-spacing: .12em; margin-top: 6px; }
      .agent-label { color: #d4d4d4; font: 700 11px JetBrains Mono, monospace; }
      .agent-textarea { width: 100%; min-height: 110px; border-radius: 18px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04); color: #fff; padding: 16px; outline: 0; resize: vertical; font: 500 13px Manrope, sans-serif; }
      .agent-textarea:focus { border-color: rgba(255,215,0,.55); box-shadow: 0 0 0 3px rgba(255,215,0,.1); }
      .agent-button { border: 1px solid rgba(255,215,0,.36); background: rgba(255,215,0,.12); color: #FFD700; border-radius: 14px; padding: 12px 14px; font: 900 10px JetBrains Mono, monospace; letter-spacing: .14em; text-transform: uppercase; cursor: pointer; }
      .agent-button.primary { background: #FFD700; color: #050505; }
      .agent-button.danger { border-color: rgba(239,68,68,.35); background: rgba(239,68,68,.1); color: #ef4444; }
      .agent-button:disabled { opacity: .45; cursor: wait; }
      .agent-box { border: 1px solid rgba(255,255,255,.08); border-radius: 18px; background: rgba(255,255,255,.035); padding: 16px; }
      .agent-box h4 { color: #FFD700; font: 900 11px JetBrains Mono, monospace; letter-spacing: .14em; text-transform: uppercase; margin: 0 0 10px; }
      .agent-box pre { white-space: pre-wrap; word-break: break-word; color: #d4d4d4; font: 500 12px JetBrains Mono, monospace; margin: 0; }
      .agent-approval { border: 1px solid rgba(255,215,0,.18); border-radius: 18px; padding: 14px; background: rgba(255,215,0,.05); display: grid; gap: 12px; }
      .agent-meta { color: #c7c7c7; font: 600 12px Manrope, sans-serif; line-height: 1.65; }
      .agent-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    `;
    document.head.appendChild(el("style", { id: "agent-styles", text: css }));
  }

  async function idToken() {
    const user = window.firebase?.auth?.().currentUser;
    if (!user) throw new Error("Firebase admin oturumu hazır değil.");
    return user.getIdToken();
  }

  async function api(action, options = {}) {
    const token = await idToken();
    const response = await fetch(`/api/agent?action=${encodeURIComponent(action)}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      const error = new Error(payload.error || `İstek başarısız (${response.status}).`);
      error.code = payload.code || "request_failed";
      throw error;
    }
    return payload;
  }

  function setBusy(value) {
    state.busy = value;
    document.querySelectorAll("[data-agent-action]").forEach((button) => {
      button.disabled = value;
    });
  }

  function setOutput(title, value) {
    const output = document.getElementById("agent-output");
    if (!output) return;
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    output.replaceChildren(el("h4", { text: title }), el("pre", { text }));
  }

  function currency(value, code) {
    try {
      return new Intl.NumberFormat("tr-TR", { style: "currency", currency: code || "TRY", maximumFractionDigits: 0 }).format(Number(value || 0));
    } catch (error) {
      return `${value || 0} ${code || "TRY"}`;
    }
  }

  async function sendCommand() {
    if (state.busy) return;
    const input = document.getElementById("agent-command-input");
    const text = input?.value?.trim();
    if (!text) return setOutput("Komut gerekli", "Önce desteklenen bir komut yazın.");

    setBusy(true);
    setOutput("Çalışıyor", "Son lead okunuyor ve onay taslağı hazırlanıyor...");
    try {
      const result = await api("command", {
        method: "POST",
        body: JSON.stringify({ text })
      });
      setOutput("Agent sonucu", {
        status: result.status,
        summary: result.summary,
        draft: result.draft,
        approvalId: result.approvalId
      });
      await loadApprovals();
    } catch (error) {
      setOutput("Agent hatası", error.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadApprovals() {
    const list = document.getElementById("agent-approvals");
    if (!list) return;
    list.replaceChildren(el("div", { class: "agent-box" }, [el("pre", { text: "Onaylar yükleniyor..." })]));
    try {
      const result = await api("status", { method: "GET" });
      state.approvals = result.approvals || [];
      list.replaceChildren();
      if (!state.approvals.length) {
        list.appendChild(el("div", { class: "agent-box" }, [el("pre", { text: "Bekleyen onay yok." })]));
        return;
      }
      state.approvals.forEach((approval) => renderApproval(list, approval));
      setBusy(state.busy);
    } catch (error) {
      list.replaceChildren(el("div", { class: "agent-box" }, [el("pre", { text: error.message })]));
    }
  }

  function renderApproval(list, approval) {
    const payload = approval.payloadPreview || {};
    const card = el("article", { class: "agent-approval" });
    card.appendChild(el("div", {
      class: "agent-title",
      text: `${approval.requestedAction || "ACTION"} // ${approval.risk || "medium"}`
    }));
    card.appendChild(el("div", {
      class: "agent-meta",
      text: [
        `Müşteri: ${payload.clientName || "—"} (${payload.clientEmailMasked || "e-posta yok"})`,
        `Kapsam: ${payload.siteType || "—"} · ${payload.designType || "—"} · ${payload.pageCount || "—"} sayfa`,
        `Teklif: ${currency(payload.totalPrice, payload.currency)} · fiyat sürümü ${payload.pricingVersion || "—"}`,
        `Süre sonu: ${approval.expiresAt ? new Date(approval.expiresAt).toLocaleString("tr-TR") : "—"}`
      ].join("\n")
    }));
    const actions = el("div", { class: "agent-actions" });
    actions.appendChild(el("button", {
      type: "button",
      class: "agent-button primary",
      text: "Onayla",
      "data-agent-action": "approve",
      onclick: () => decide(approval.id, "approve")
    }));
    actions.appendChild(el("button", {
      type: "button",
      class: "agent-button danger",
      text: "Reddet",
      "data-agent-action": "reject",
      onclick: () => decide(approval.id, "reject")
    }));
    card.appendChild(actions);
    list.appendChild(card);
  }

  async function decide(approvalId, decision) {
    if (state.busy) return;
    const message = decision === "approve"
      ? "Bu teklif taslağı Firestore'a kaydedilecek. Onaylıyor musunuz?"
      : "Bu bekleyen agent işlemini reddetmek istiyor musunuz?";
    const confirmed = typeof window.systemConfirm === "function"
      ? await window.systemConfirm("AGENT ONAYI", message, "shield-check")
      : window.confirm(message);
    if (!confirmed) return;

    setBusy(true);
    try {
      const result = await api("approve", {
        method: "POST",
        body: JSON.stringify({ approvalId, decision })
      });
      setOutput("Onay sonucu", result);
      await loadApprovals();
    } catch (error) {
      setOutput("Onay hatası", error.message);
    } finally {
      setBusy(false);
    }
  }

  function closePanel() {
    const panel = document.getElementById("agent-panel");
    if (!panel) return;
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    if (state.lastFocus && typeof state.lastFocus.focus === "function") state.lastFocus.focus();
  }

  function openPanel() {
    const panel = document.getElementById("agent-panel");
    if (!panel) return;
    state.lastFocus = document.activeElement;
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    document.getElementById("agent-command-input")?.focus();
    loadApprovals();
  }

  function mount() {
    if (state.mounted) return;
    state.mounted = true;
    installStyles();

    const launcher = el("div", { id: "agent-launcher" }, [
      el("button", { type: "button", text: "AGENT", "aria-haspopup": "dialog", onclick: openPanel })
    ]);
    const panel = el("div", { id: "agent-panel", role: "dialog", "aria-modal": "true", "aria-labelledby": "agent-title", "aria-hidden": "true" });
    panel.appendChild(el("div", { class: "agent-card" }, [
      el("div", { class: "agent-head" }, [
        el("div", {}, [
          el("div", { id: "agent-title", class: "agent-title", text: "$ AGENT COMMAND" }),
          el("div", { class: "agent-sub", text: "OKU → ÖNER → AÇIK ONAY" })
        ]),
        el("button", { type: "button", class: "agent-button", text: "Kapat", onclick: closePanel })
      ]),
      el("div", { class: "agent-body" }, [
        el("label", { class: "agent-label", for: "agent-command-input", text: "Komut" }),
        el("textarea", {
          id: "agent-command-input",
          class: "agent-textarea",
          maxlength: "2000",
          placeholder: "Son gelen mesajı özetle ve teklif taslağı hazırla"
        }),
        el("div", { class: "agent-actions" }, [
          el("button", { type: "button", class: "agent-button primary", text: "Agent'ı çalıştır", "data-agent-action": "command", onclick: sendCommand }),
          el("button", { type: "button", class: "agent-button", text: "Onayları yenile", "data-agent-action": "refresh", onclick: loadApprovals })
        ]),
        el("div", { id: "agent-output", class: "agent-box" }, [el("h4", { text: "Çıktı" }), el("pre", { text: "Agent hazır." })]),
        el("section", { class: "agent-box", "aria-labelledby": "agent-approvals-title" }, [
          el("h4", { id: "agent-approvals-title", text: "Bekleyen onaylar" }),
          el("div", { id: "agent-approvals" })
        ])
      ])
    ]));
    panel.addEventListener("click", (event) => { if (event.target === panel) closePanel(); });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && panel.classList.contains("open")) closePanel();
    });
    document.body.appendChild(launcher);
    document.body.appendChild(panel);
  }

  function waitForAuthenticatedAdmin(attempt = 0) {
    if (window.firebase?.auth) {
      window.firebase.auth().onAuthStateChanged((user) => { if (user) mount(); });
      if (window.firebase.auth().currentUser) mount();
      return;
    }
    if (attempt < 40) setTimeout(() => waitForAuthenticatedAdmin(attempt + 1), 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => waitForAuthenticatedAdmin(), { once: true });
  } else {
    waitForAuthenticatedAdmin();
  }
})();
