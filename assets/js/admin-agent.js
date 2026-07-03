(() => {
  if (!/admin\.html$/.test(window.location.pathname)) return;

  const state = {
    mounted: false,
    busy: false,
    approvals: [],
    lastFocus: null,
    tab: "chat",
    listening: false,
    recog: null,
    stream: null,
    audioCtx: null,
    analyser: null,
    raf: 0,
    toastTimer: 0
  };

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key === "html") node.innerHTML = value;
      else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
      else if (value !== null && value !== undefined) node.setAttribute(key, String(value));
    });
    children.forEach((child) => node.appendChild(typeof child === "string" ? document.createTextNode(child) : child));
    return node;
  }

  const MIC_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>';
  const SEND_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';
  const STOP_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';

  function installStyles() {
    if (document.getElementById("agent-styles")) return;
    const css = `
      #agent-launcher { position: fixed; right: 18px; bottom: calc(18px + env(safe-area-inset-bottom)); z-index: 180; display: none; }
      #agent-launcher button { width: 56px; height: 56px; border-radius: 50%; border: 2px solid #FFD700; background: #0a0a06; display: grid; place-items: center; cursor: pointer; box-shadow: 0 0 26px rgba(255,215,0,.28); }
      #agent-launcher img { width: 60%; height: 60%; object-fit: contain; }
      @media (max-width: 1023px) { #agent-launcher { display: block; } }

      #agent-panel { position: fixed; inset: 0; z-index: 220; display: none; flex-direction: column; height: 100dvh; background: radial-gradient(circle at 50% 26%, #17140a 0%, #0a0906 42%, #050505 78%); overscroll-behavior: none; }
      #agent-panel.open { display: flex; }

      .agent-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: calc(12px + env(safe-area-inset-top)) 18px 10px; }
      .agent-top-title { display: flex; align-items: center; gap: 10px; color: #fff; font: 900 12px "JetBrains Mono", monospace; letter-spacing: .22em; }
      .agent-top-title img { width: 26px; height: 26px; }
      .agent-close { width: 38px; height: 38px; border-radius: 50%; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.05); color: #fff; font: 700 15px/1 sans-serif; cursor: pointer; }
      .agent-close:hover { border-color: #FFD700; color: #FFD700; }

      .agent-hero { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 6px 16px 2px; transition: all .35s ease; }
      .agent-halo { --lvl: 0; position: relative; width: min(52vw, 210px); aspect-ratio: 1; display: grid; place-items: center; transition: width .35s ease; }
      #agent-panel.compact .agent-halo { width: min(26vw, 96px); }
      .agent-ring { position: absolute; border-radius: 50%; pointer-events: none; transition: opacity .3s; }
      .agent-ring.r1 { inset: 6%;  border: 1px solid rgba(255,215,0,.30); }
      .agent-ring.r2 { inset: -8%; border: 1px solid rgba(255,215,0,.16); }
      .agent-ring.r3 { inset: -22%; border: 1px solid rgba(255,215,0,.08); }
      #agent-panel.idle .agent-ring { animation: agentBreathe 3.2s ease-in-out infinite; }
      #agent-panel.idle .agent-ring.r2 { animation-delay: .35s; }
      #agent-panel.idle .agent-ring.r3 { animation-delay: .7s; }
      @keyframes agentBreathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.035); } }
      #agent-panel.listening .agent-ring { animation: none; }
      #agent-panel.listening .agent-ring.r1 { transform: scale(calc(1 + var(--lvl) * .16)); }
      #agent-panel.listening .agent-ring.r2 { transform: scale(calc(1 + var(--lvl) * .30)); }
      #agent-panel.listening .agent-ring.r3 { transform: scale(calc(1 + var(--lvl) * .46)); }
      #agent-panel.thinking .agent-ring { animation: agentSpinPulse 1.1s ease-in-out infinite; }
      @keyframes agentSpinPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.06); opacity: .55; } }
      .agent-core { width: 62%; aspect-ratio: 1; border-radius: 50%; background: #0b0a05; border: 2px solid #FFD700; display: grid; place-items: center; box-shadow: 0 0 42px rgba(255,215,0,.28), 0 0 120px rgba(255,215,0,.10); transition: box-shadow .15s; }
      #agent-panel.listening .agent-core { box-shadow: 0 0 calc(36px + var(--lvl) * 90px) rgba(255,215,0,calc(.28 + var(--lvl) * .3)), 0 0 130px rgba(255,215,0,.12); }
      .agent-core img { width: 58%; height: 58%; object-fit: contain; }
      .agent-status { min-height: 16px; color: #9a9a92; font: 700 10.5px "JetBrains Mono", monospace; letter-spacing: .2em; text-transform: uppercase; }
      #agent-panel.listening .agent-status { color: #FFD700; }

      .agent-main { flex: 1; min-height: 0; display: flex; flex-direction: column; width: min(720px, 100%); margin: 0 auto; }
      .agent-tabs { display: flex; justify-content: center; gap: 2px; padding: 4px 10px 0; }
      .agent-tab { background: none; border: 0; border-bottom: 2px solid transparent; color: #86867e; padding: 10px 12px; font: 800 10px "JetBrains Mono", monospace; letter-spacing: .16em; cursor: pointer; }
      .agent-tab.active { color: #FFD700; border-color: #FFD700; }
      .agent-content { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; padding: 14px 18px; }
      .agent-pane { display: none; }
      .agent-pane.active { display: block; }

      .agent-chat-log { display: flex; flex-direction: column; gap: 10px; }
      .agent-bubble { max-width: 82%; padding: 11px 14px; border-radius: 16px; font: 500 13.5px Manrope, sans-serif; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
      .agent-bubble.user { align-self: flex-end; background: #FFD700; color: #0a0a05; border-bottom-right-radius: 4px; font-weight: 600; }
      .agent-bubble.agent { align-self: flex-start; background: rgba(255,255,255,.055); color: #e9e9e4; border: 1px solid rgba(255,255,255,.08); border-bottom-left-radius: 4px; }
      .agent-bubble.typing { color: #FFD700; letter-spacing: .3em; animation: agentBlink 1s steps(4) infinite; }
      @keyframes agentBlink { 50% { opacity: .35; } }

      .agent-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; padding-top: 14px; }
      .agent-chip { border: 1px solid rgba(255,215,0,.3); background: rgba(255,215,0,.06); color: #e8d792; border-radius: 999px; padding: 9px 14px; font: 600 12px Manrope, sans-serif; cursor: pointer; }
      .agent-chip:hover { background: rgba(255,215,0,.14); }

      .agent-inputbar { display: flex; align-items: center; gap: 8px; width: min(720px, 100%); margin: 0 auto; padding: 10px 14px calc(14px + env(safe-area-inset-bottom)); }
      .agent-field { flex: 1; min-width: 0; border-radius: 999px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.05); color: #fff; padding: 13px 18px; outline: 0; font: 500 15px Manrope, sans-serif; }
      .agent-field:focus { border-color: rgba(255,215,0,.6); }
      .agent-field::placeholder { color: #77776e; }
      .agent-round { flex: 0 0 auto; width: 46px; height: 46px; border-radius: 50%; border: 1px solid rgba(255,215,0,.4); background: rgba(255,215,0,.1); color: #FFD700; display: grid; place-items: center; cursor: pointer; }
      .agent-round svg { width: 20px; height: 20px; }
      .agent-round.primary { background: #FFD700; color: #0a0a05; }
      .agent-round.rec { background: #FFD700; color: #0a0a05; animation: agentBlink 1.2s ease-in-out infinite; }
      .agent-round:disabled { opacity: .45; cursor: wait; }

      .agent-card { border: 1px solid rgba(255,255,255,.09); border-radius: 16px; background: rgba(255,255,255,.035); padding: 14px; margin-bottom: 10px; }
      .agent-card h4 { color: #FFD700; font: 900 10.5px "JetBrains Mono", monospace; letter-spacing: .14em; text-transform: uppercase; margin: 0 0 8px; }
      .agent-meta { color: #c9c9c2; font: 500 12.5px Manrope, sans-serif; line-height: 1.65; white-space: pre-wrap; }
      .agent-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 2px; border-bottom: 1px solid rgba(255,255,255,.06); }
      .agent-item:last-child { border-bottom: 0; }
      .agent-item-text { color: #e6e6e0; font: 600 13px Manrope, sans-serif; line-height: 1.5; word-break: break-word; }
      .agent-item-sub { color: #8b8b82; font: 700 10px "JetBrains Mono", monospace; letter-spacing: .08em; margin-top: 2px; }
      .agent-empty { color: #8b8b82; font: 600 12.5px Manrope, sans-serif; padding: 8px 2px; }

      .agent-btn { border: 1px solid rgba(255,215,0,.35); background: rgba(255,215,0,.1); color: #FFD700; border-radius: 12px; padding: 10px 14px; font: 900 10px "JetBrains Mono", monospace; letter-spacing: .12em; text-transform: uppercase; cursor: pointer; flex: 0 0 auto; }
      .agent-btn.primary { background: #FFD700; color: #0a0a05; }
      .agent-btn.danger { border-color: rgba(239,68,68,.4); background: rgba(239,68,68,.1); color: #ef4444; }
      .agent-btn:disabled { opacity: .45; cursor: wait; }
      .agent-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }

      .agent-form { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
      .agent-input { flex: 1 1 170px; min-width: 0; border-radius: 12px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05); color: #fff; padding: 11px 13px; outline: 0; font: 500 13px Manrope, sans-serif; }
      .agent-input:focus { border-color: rgba(255,215,0,.55); }
      .agent-input[type="date"], .agent-input[type="time"] { flex: 0 1 135px; color-scheme: dark; }

      #agent-toast { position: fixed; left: 50%; bottom: calc(96px + env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 240; background: #14120a; border: 1px solid rgba(255,215,0,.4); color: #FFD700; border-radius: 999px; padding: 11px 18px; font: 700 11px "JetBrains Mono", monospace; letter-spacing: .06em; opacity: 0; pointer-events: none; transition: opacity .25s; max-width: 88vw; text-align: center; }
      #agent-toast.show { opacity: 1; }

      /* 16px fields stop iOS Safari from auto-zooming on focus */
      @media (max-width: 640px) {
        .agent-field, .agent-input { font-size: 16px !important; }
        .agent-bubble { max-width: 88%; }
      }
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

  function toast(message) {
    const node = document.getElementById("agent-toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => node.classList.remove("show"), 3200);
  }

  function setBusy(value) {
    state.busy = value;
    document.querySelectorAll("[data-agent-action]").forEach((button) => { button.disabled = value; });
  }

  function setStatus(text) {
    const node = document.getElementById("agent-status");
    if (node) node.textContent = text;
  }

  function setMode(mode) {
    const panel = document.getElementById("agent-panel");
    if (!panel) return;
    panel.classList.remove("idle", "listening", "thinking");
    panel.classList.add(mode);
  }

  function currency(value, code) {
    try {
      return new Intl.NumberFormat("tr-TR", { style: "currency", currency: code || "TRY", maximumFractionDigits: 0 }).format(Number(value || 0));
    } catch (error) {
      return `${value || 0} ${code || "TRY"}`;
    }
  }

  function addBubble(role, text) {
    const log = document.getElementById("agent-chat-log");
    if (!log) return null;
    const chips = document.getElementById("agent-chips");
    if (chips) chips.remove();
    const bubble = el("div", { class: `agent-bubble ${role}`, text });
    log.appendChild(bubble);
    document.getElementById("agent-panel")?.classList.add("compact");
    const content = document.getElementById("agent-content");
    if (content) content.scrollTop = content.scrollHeight;
    return bubble;
  }

  function proposalMessage(result) {
    const summary = result.summary || {};
    const draft = result.draft || {};
    const lines = [];
    if (summary.summary) lines.push(`Lead özeti: ${summary.summary}`);
    if (draft.clientName) lines.push(`Müşteri: ${draft.clientName} (${draft.clientEmailMasked || "e-posta yok"})`);
    if (draft.totalPrice) lines.push(`Teklif taslağı: ${currency(draft.totalPrice, draft.currency)} — ${draft.siteType || "?"} · ${draft.designType || "?"} · ${draft.pageCount || "?"} sayfa`);
    lines.push("Taslak hazır. ONAYLAR sekmesinden onaylayabilir veya reddedebilirsiniz.");
    return lines.join("\n");
  }

  async function sendCommand(textOverride) {
    if (state.busy) return;
    const input = document.getElementById("agent-field");
    const text = String(textOverride || input?.value || "").trim();
    if (!text) return toast("Önce bir şey yazın veya söyleyin.");
    if (input) input.value = "";

    selectTab("chat");
    addBubble("user", text);
    const typing = addBubble("agent", "● ● ●");
    if (typing) typing.classList.add("typing");
    setMode("thinking");
    setStatus("Düşünüyorum...");
    setBusy(true);
    try {
      const result = await api("command", { method: "POST", body: JSON.stringify({ text }) });
      typing?.remove();
      const message = (typeof result.message === "string" && result.message)
        ? result.message
        : (result.status === "waiting_approval" ? proposalMessage(result) : (result.message || "Tamamlandı."));
      addBubble("agent", message);
      if (result.status === "waiting_approval") loadApprovals();
      if (/^todo/.test(result.intent || "")) loadTodos();
      if (result.intent === "event_add" || result.intent === "agenda_list") loadAgenda();
    } catch (error) {
      typing?.remove();
      addBubble("agent", `⚠️ ${error.message}`);
    } finally {
      setBusy(false);
      setMode("idle");
      setStatus("Hazır");
    }
  }

  /* ---------- voice ---------- */

  function speechCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function animateHalo() {
    const halo = document.getElementById("agent-halo");
    if (!halo || !state.analyser) return;
    const data = new Uint8Array(state.analyser.frequencyBinCount);
    const loop = () => {
      if (!state.listening || !state.analyser) return;
      state.analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const level = Math.min(1, Math.sqrt(sum / data.length) * 4.5);
      halo.style.setProperty("--lvl", level.toFixed(3));
      state.raf = requestAnimationFrame(loop);
    };
    state.raf = requestAnimationFrame(loop);
  }

  function stopVoice() {
    state.listening = false;
    cancelAnimationFrame(state.raf);
    if (state.recog) { try { state.recog.abort(); } catch (e) {} state.recog = null; }
    if (state.stream) { state.stream.getTracks().forEach((track) => track.stop()); state.stream = null; }
    if (state.audioCtx) { state.audioCtx.close().catch(() => {}); state.audioCtx = null; }
    state.analyser = null;
    document.getElementById("agent-halo")?.style.setProperty("--lvl", "0");
    const mic = document.getElementById("agent-mic");
    if (mic) { mic.classList.remove("rec"); mic.innerHTML = MIC_ICON; }
    const panel = document.getElementById("agent-panel");
    if (panel?.classList.contains("listening")) { setMode("idle"); setStatus("Hazır"); }
  }

  async function startVoice() {
    if (state.listening) { stopVoice(); return; }
    const Ctor = speechCtor();
    if (!Ctor) return toast("Bu tarayıcı sesli girişi desteklemiyor.");

    try {
      state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      return toast("Mikrofon izni verilmedi.");
    }

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      state.audioCtx = new AudioCtx();
      const source = state.audioCtx.createMediaStreamSource(state.stream);
      state.analyser = state.audioCtx.createAnalyser();
      state.analyser.fftSize = 512;
      source.connect(state.analyser);
    } catch (error) { /* halo stays idle; recognition still works */ }

    const recog = new Ctor();
    recog.lang = "tr-TR";
    recog.interimResults = true;
    recog.continuous = false;
    const input = document.getElementById("agent-field");

    recog.onresult = (event) => {
      let interim = "";
      let final = "";
      for (const result of event.results) {
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (input) input.value = (final || interim).trim();
    };
    recog.onend = () => {
      const text = input?.value?.trim();
      stopVoice();
      if (text) sendCommand(text);
    };
    recog.onerror = (event) => {
      const code = event?.error;
      stopVoice();
      if (code === "not-allowed" || code === "service-not-allowed") toast("Mikrofon izni reddedildi.");
      else if (code && code !== "aborted" && code !== "no-speech") toast(`Ses tanıma hatası: ${code}`);
      else if (code === "no-speech") toast("Ses algılanamadı, tekrar deneyin.");
    };

    state.recog = recog;
    state.listening = true;
    setMode("listening");
    setStatus("Dinliyorum...");
    const mic = document.getElementById("agent-mic");
    if (mic) { mic.classList.add("rec"); mic.innerHTML = STOP_ICON; }
    animateHalo();
    try { recog.start(); } catch (error) { stopVoice(); toast("Ses tanıma başlatılamadı."); }
  }

  /* ---------- data panes ---------- */

  async function loadApprovals() {
    const list = document.getElementById("agent-approvals");
    if (!list) return;
    list.replaceChildren(el("div", { class: "agent-empty", text: "Onaylar yükleniyor..." }));
    try {
      const result = await api("status", { method: "GET" });
      state.approvals = result.approvals || [];
      list.replaceChildren();
      if (!state.approvals.length) {
        list.appendChild(el("div", { class: "agent-empty", text: "Bekleyen onay yok." }));
        return;
      }
      state.approvals.forEach((approval) => renderApproval(list, approval));
      setBusy(state.busy);
    } catch (error) {
      list.replaceChildren(el("div", { class: "agent-empty", text: error.message }));
    }
  }

  function renderApproval(list, approval) {
    const payload = approval.payloadPreview || {};
    const card = el("article", { class: "agent-card" });
    card.appendChild(el("h4", { text: `${approval.requestedAction || "ACTION"} · ${approval.risk || "medium"}` }));
    card.appendChild(el("div", {
      class: "agent-meta",
      text: [
        `Müşteri: ${payload.clientName || "—"} (${payload.clientEmailMasked || "e-posta yok"})`,
        `Kapsam: ${payload.siteType || "—"} · ${payload.designType || "—"} · ${payload.pageCount || "—"} sayfa`,
        `Teklif: ${currency(payload.totalPrice, payload.currency)}`,
        `Süre sonu: ${approval.expiresAt ? new Date(approval.expiresAt).toLocaleString("tr-TR") : "—"}`
      ].join("\n")
    }));
    const actions = el("div", { class: "agent-actions" });
    actions.appendChild(el("button", { type: "button", class: "agent-btn primary", text: "Onayla", "data-agent-action": "approve", onclick: () => decide(approval.id, "approve") }));
    actions.appendChild(el("button", { type: "button", class: "agent-btn danger", text: "Reddet", "data-agent-action": "reject", onclick: () => decide(approval.id, "reject") }));
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
      const result = await api("approve", { method: "POST", body: JSON.stringify({ approvalId, decision }) });
      toast(decision === "approve" ? `Onaylandı: ${result.result?.quoteNumber || result.approvalId}` : "Reddedildi.");
      await loadApprovals();
    } catch (error) {
      toast(`Onay hatası: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function loadTodos() {
    const list = document.getElementById("agent-todos");
    if (!list) return;
    list.replaceChildren(el("div", { class: "agent-empty", text: "Yükleniyor..." }));
    try {
      const result = await api("todos", { method: "GET" });
      const todos = result.todos || [];
      list.replaceChildren();
      if (!todos.length) {
        list.appendChild(el("div", { class: "agent-empty", text: "Açık yapılacak iş yok." }));
        return;
      }
      todos.forEach((todo) => {
        list.appendChild(el("div", { class: "agent-item" }, [
          el("div", {}, [
            el("div", { class: "agent-item-text", text: todo.title }),
            el("div", { class: "agent-item-sub", text: todo.dueDateKey ? `SON: ${todo.dueDateKey}` : "" })
          ]),
          el("button", { type: "button", class: "agent-btn", text: "Tamamla", "data-agent-action": "todo-done", onclick: () => completeTodoItem(todo.id) })
        ]));
      });
    } catch (error) {
      list.replaceChildren(el("div", { class: "agent-empty", text: error.message }));
    }
  }

  async function completeTodoItem(id) {
    if (state.busy) return;
    setBusy(true);
    try {
      await api("todo", { method: "POST", body: JSON.stringify({ op: "complete", id }) });
      await loadTodos();
    } catch (error) {
      toast(`Todo hatası: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function addTodoItem() {
    if (state.busy) return;
    const input = document.getElementById("agent-todo-input");
    const title = input?.value?.trim();
    if (!title) return;
    setBusy(true);
    try {
      await api("todo", { method: "POST", body: JSON.stringify({ op: "add", title }) });
      input.value = "";
      await loadTodos();
    } catch (error) {
      toast(`Todo hatası: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function loadAgenda() {
    const list = document.getElementById("agent-agenda");
    if (!list) return;
    list.replaceChildren(el("div", { class: "agent-empty", text: "Yükleniyor..." }));
    try {
      const result = await api("agenda", { method: "GET" });
      const events = result.events || [];
      list.replaceChildren();
      if (!events.length) {
        list.appendChild(el("div", { class: "agent-empty", text: "Önümüzdeki 14 günde etkinlik yok." }));
        return;
      }
      events.forEach((event) => {
        list.appendChild(el("div", { class: "agent-item" }, [
          el("div", {}, [
            el("div", { class: "agent-item-text", text: event.title }),
            el("div", { class: "agent-item-sub", text: `${event.dateKey}${event.time ? ` · ${event.time}` : ""}` })
          ])
        ]));
      });
    } catch (error) {
      list.replaceChildren(el("div", { class: "agent-empty", text: error.message }));
    }
  }

  async function addAgendaItem() {
    if (state.busy) return;
    const title = document.getElementById("agent-event-title")?.value?.trim();
    const dateKey = document.getElementById("agent-event-date")?.value;
    const time = document.getElementById("agent-event-time")?.value || null;
    if (!title || !dateKey) return toast("Etkinlik başlığı ve tarihi gereklidir.");
    setBusy(true);
    try {
      await api("event", { method: "POST", body: JSON.stringify({ title, dateKey, time }) });
      document.getElementById("agent-event-title").value = "";
      await loadAgenda();
    } catch (error) {
      toast(`Ajanda hatası: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  /* ---------- panel ---------- */

  function selectTab(name) {
    state.tab = name;
    document.querySelectorAll(".agent-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
    document.querySelectorAll(".agent-pane").forEach((pane) => pane.classList.toggle("active", pane.dataset.pane === name));
    const inputBar = document.getElementById("agent-inputbar");
    if (inputBar) inputBar.style.display = name === "chat" ? "flex" : "none";
    if (name === "approvals") loadApprovals();
    if (name === "todos") loadTodos();
    if (name === "agenda") loadAgenda();
  }

  function closePanel() {
    const panel = document.getElementById("agent-panel");
    if (!panel) return;
    stopVoice();
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
    if (state.lastFocus && typeof state.lastFocus.focus === "function") state.lastFocus.focus();
  }

  function openPanel() {
    const panel = document.getElementById("agent-panel");
    if (!panel) return;
    state.lastFocus = document.activeElement;
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    // lock page scroll so only the panel content scrolls (mobile: no bleed-through)
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    setMode("idle");
    setStatus("Hazır");
    selectTab("chat");
    loadApprovals();
  }

  const LOGO_SRC = "favicon_taurus.svg";

  function buildPanel() {
    const panel = el("div", { id: "agent-panel", class: "idle", role: "dialog", "aria-modal": "true", "aria-label": "Taurus Agent", "aria-hidden": "true" });

    panel.appendChild(el("div", { class: "agent-top" }, [
      el("div", { class: "agent-top-title" }, [
        el("img", { src: LOGO_SRC, alt: "" }),
        el("span", { text: "TAURUS AGENT" })
      ]),
      el("button", { type: "button", class: "agent-close", "aria-label": "Kapat", text: "✕", onclick: closePanel })
    ]));

    panel.appendChild(el("div", { class: "agent-hero" }, [
      el("div", { id: "agent-halo", class: "agent-halo" }, [
        el("div", { class: "agent-ring r3" }),
        el("div", { class: "agent-ring r2" }),
        el("div", { class: "agent-ring r1" }),
        el("div", { class: "agent-core" }, [el("img", { src: LOGO_SRC, alt: "Taurus" })])
      ]),
      el("div", { id: "agent-status", class: "agent-status", text: "Hazır" })
    ]));

    const chatPane = el("div", { class: "agent-pane active", "data-pane": "chat" }, [
      el("div", { id: "agent-chat-log", class: "agent-chat-log" }),
      el("div", { id: "agent-chips", class: "agent-chips" }, [
        el("button", { type: "button", class: "agent-chip", text: "Bugün ajandada ne var?", onclick: () => sendCommand("Bugün ajandada ne var?") }),
        el("button", { type: "button", class: "agent-chip", text: "Son lead'i özetle ve teklif hazırla", onclick: () => sendCommand("Son gelen mesajı özetle ve teklif taslağı hazırla") }),
        el("button", { type: "button", class: "agent-chip", text: "Yapılacakları göster", onclick: () => sendCommand("Yapılacakları listele") })
      ])
    ]);

    const approvalsPane = el("div", { class: "agent-pane", "data-pane": "approvals" }, [el("div", { id: "agent-approvals" })]);

    const todosPane = el("div", { class: "agent-pane", "data-pane": "todos" }, [
      el("div", { id: "agent-todos" }),
      el("div", { class: "agent-form" }, [
        el("input", { id: "agent-todo-input", class: "agent-input", type: "text", maxlength: "240", placeholder: "Yeni yapılacak iş..." }),
        el("button", { type: "button", class: "agent-btn primary", text: "Ekle", "data-agent-action": "todo-add", onclick: addTodoItem })
      ])
    ]);

    const agendaPane = el("div", { class: "agent-pane", "data-pane": "agenda" }, [
      el("div", { id: "agent-agenda" }),
      el("div", { class: "agent-form" }, [
        el("input", { id: "agent-event-title", class: "agent-input", type: "text", maxlength: "240", placeholder: "Etkinlik başlığı..." }),
        el("input", { id: "agent-event-date", class: "agent-input", type: "date" }),
        el("input", { id: "agent-event-time", class: "agent-input", type: "time" }),
        el("button", { type: "button", class: "agent-btn primary", text: "Ekle", "data-agent-action": "event-add", onclick: addAgendaItem })
      ])
    ]);

    panel.appendChild(el("div", { class: "agent-main" }, [
      el("div", { class: "agent-tabs", role: "tablist" }, [
        el("button", { type: "button", class: "agent-tab active", "data-tab": "chat", text: "SOHBET", onclick: () => selectTab("chat") }),
        el("button", { type: "button", class: "agent-tab", "data-tab": "approvals", text: "ONAYLAR", onclick: () => selectTab("approvals") }),
        el("button", { type: "button", class: "agent-tab", "data-tab": "todos", text: "YAPILACAKLAR", onclick: () => selectTab("todos") }),
        el("button", { type: "button", class: "agent-tab", "data-tab": "agenda", text: "AJANDA", onclick: () => selectTab("agenda") })
      ]),
      el("div", { id: "agent-content", class: "agent-content" }, [chatPane, approvalsPane, todosPane, agendaPane])
    ]));

    const field = el("input", {
      id: "agent-field",
      class: "agent-field",
      type: "text",
      maxlength: "2000",
      placeholder: "Yazın ya da mikrofona konuşun...",
      autocomplete: "off"
    });
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter") { event.preventDefault(); sendCommand(); }
    });
    const micBtn = el("button", { type: "button", id: "agent-mic", class: "agent-round", "aria-label": "Sesle komut ver", html: MIC_ICON, onclick: startVoice });
    const sendBtn = el("button", { type: "button", class: "agent-round primary", "aria-label": "Gönder", html: SEND_ICON, "data-agent-action": "command", onclick: () => sendCommand() });
    panel.appendChild(el("div", { id: "agent-inputbar", class: "agent-inputbar" }, [field, micBtn, sendBtn]));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && panel.classList.contains("open")) closePanel();
    });
    return panel;
  }

  function bindSidebarLogo() {
    const logo = document.querySelector("#sidebar-menu .logo-container");
    if (!logo) return false;
    logo.setAttribute("title", "Taurus Agent");
    logo.setAttribute("role", "button");
    logo.setAttribute("aria-haspopup", "dialog");
    logo.addEventListener("click", (event) => {
      // the logo now opens the agent; the text next to it still links home
      event.preventDefault();
      event.stopPropagation();
      openPanel();
    });
    return true;
  }

  function mount() {
    if (state.mounted) return;
    state.mounted = true;
    installStyles();

    // mobile fallback launcher (sidebar is hidden behind the hamburger there)
    const launcher = el("div", { id: "agent-launcher" }, [
      el("button", { type: "button", "aria-haspopup": "dialog", "aria-label": "Taurus Agent", onclick: openPanel }, [
        el("img", { src: LOGO_SRC, alt: "Taurus Agent" })
      ])
    ]);

    document.body.appendChild(launcher);
    document.body.appendChild(buildPanel());
    document.body.appendChild(el("div", { id: "agent-toast", role: "status", "aria-live": "polite" }));
    bindSidebarLogo();
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
