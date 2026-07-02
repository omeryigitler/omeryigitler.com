const { admin, db } = require("../api/_firebaseAdmin");
const { INTENTS, maskEmail, validationError } = require("./agent-validation");

const AGENT_TIMEZONE = process.env.AGENT_TIMEZONE || "Europe/Istanbul";
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TITLE = 240;
const TODO_LIMIT = 50;
const AGENDA_LIMIT = 50;
const CHAT_CONTEXT_LIMIT = 12;

const WEEKDAYS = {
  pazartesi: 1, salı: 2, sali: 2, çarşamba: 3, carsamba: 3,
  perşembe: 4, persembe: 4, cuma: 5, cumartesi: 6, pazar: 0
};

function dateKeyInTz(date, timeZone = AGENT_TIMEZONE) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit"
  }).format(date);
}

function weekdayInTz(date, timeZone = AGENT_TIMEZONE) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

function addDaysKey(now, days, timeZone = AGENT_TIMEZONE) {
  return dateKeyInTz(new Date(now.getTime() + days * DAY_MS), timeZone);
}

// Parses a Turkish command into { dateKey, time } wall-clock values in the agent
// timezone. Supports "bugün/yarın", weekday names, dd.mm(.yyyy) and HH:MM forms.
function parseTurkishDateTime(text, now = new Date(), timeZone = AGENT_TIMEZONE) {
  const normalized = String(text || "").toLocaleLowerCase("tr-TR");
  let dateKey = null;

  if (/(bugün|bugun|today)/.test(normalized)) dateKey = dateKeyInTz(now, timeZone);
  else if (/(yarın|yarin|tomorrow)/.test(normalized)) dateKey = addDaysKey(now, 1, timeZone);
  else if (/(haftaya|gelecek hafta|next week)/.test(normalized)) dateKey = addDaysKey(now, 7, timeZone);

  if (!dateKey) {
    for (const [name, target] of Object.entries(WEEKDAYS)) {
      if (!normalized.includes(name)) continue;
      const today = weekdayInTz(now, timeZone);
      let delta = (target - today + 7) % 7;
      if (delta === 0) delta = 7;
      dateKey = addDaysKey(now, delta, timeZone);
      break;
    }
  }

  if (!dateKey) {
    const explicit = /(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?/.exec(normalized);
    if (explicit) {
      const day = Number(explicit[1]);
      const month = Number(explicit[2]);
      // A d.M pair only counts as a date when it is calendar-valid; otherwise it
      // was probably a time or version-like token.
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        let year = explicit[3] ? Number(explicit[3]) : Number(dateKeyInTz(now, timeZone).slice(0, 4));
        if (year < 100) year += 2000;
        dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }
  }

  let time = null;
  const clock = /(?:saat\s*)?(\d{1,2}):(\d{2})/.exec(normalized);
  if (clock && Number(clock[1]) <= 23 && Number(clock[2]) <= 59) {
    time = `${String(Number(clock[1])).padStart(2, "0")}:${clock[2]}`;
  } else {
    const bare = /saat\s+(\d{1,2})\b/.exec(normalized);
    if (bare && Number(bare[1]) <= 23) time = `${String(Number(bare[1])).padStart(2, "0")}:00`;
  }

  return { dateKey, time };
}

function stripKeywords(text, extraPatterns = []) {
  let value = String(text || "");
  // "todo ekle: başlık" shortcut — a colon not belonging to a clock time (14:00).
  const colon = /(?<![0-9])[:—]\s*(.+)$/s.exec(value);
  if (colon && colon[1].trim()) return colon[1].trim().slice(0, MAX_TITLE);

  // Trailing [a-zçğıöşü]* swallows Turkish suffixes ("takvime", "listesine", "görevini").
  const patterns = [
    /(yapılacak|yapilacak|to-?do|görev|gorev|liste)[a-zçğıöşü]*/gi,
    /(ajanda|takvim|randevu|toplantı|toplanti|etkinlik|calendar|event|meeting)[a-zçğıöşü]*/gi,
    /(ekle|kaydet|oluştur|olustur|planla|not al|yaz|add|create|schedule)[a-zçğıöşü]*/gi,
    /(bugün|bugun|yarın|yarin|haftaya|gelecek hafta|today|tomorrow|next week)/gi,
    /(pazartesi|salı|sali|çarşamba|carsamba|perşembe|persembe|cuma|cumartesi|pazar)[a-zçğıöşü]*/gi,
    /(?:saat\s*)?\d{1,2}:\d{2}/gi,
    /saat\s+\d{1,2}\b/gi,
    /\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?/g,
    ...extraPatterns
  ];
  patterns.forEach((pattern) => { value = value.replace(pattern, " "); });
  return value.replace(/\s+/g, " ").replace(/^[,.\s]+|[,.\s]+$/g, "").trim().slice(0, MAX_TITLE);
}

function serializeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") return new Date(value.toMillis()).toISOString();
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  return null;
}

function normalizeTodo(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    title: data.title || "",
    status: data.status || "open",
    dueDateKey: data.dueDateKey || null,
    createdAt: serializeTimestamp(data.createdAt),
    completedAt: serializeTimestamp(data.completedAt),
    createdBy: data.createdBy || null
  };
}

function normalizeEvent(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    title: data.title || "",
    dateKey: data.dateKey || null,
    time: data.time || null,
    status: data.status || "scheduled",
    createdAt: serializeTimestamp(data.createdAt),
    createdBy: data.createdBy || null
  };
}

async function addTodo({ title, dueDateKey = null, actorId = "unknown", source = "admin_panel" }) {
  const safeTitle = String(title || "").trim().slice(0, MAX_TITLE);
  if (!safeTitle) throw validationError(400, "todo_title_required", "Yapılacak iş için bir başlık gereklidir.");

  const ref = db.collection("agent_todos").doc();
  await ref.set({
    title: safeTitle,
    status: "open",
    dueDateKey: dueDateKey || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    completedAt: null,
    createdBy: actorId,
    source
  });
  return { id: ref.id, title: safeTitle, status: "open", dueDateKey: dueDateKey || null };
}

async function listTodos({ includeDone = false } = {}) {
  const snapshot = await db.collection("agent_todos")
    .orderBy("createdAt", "desc")
    .limit(TODO_LIMIT)
    .get();
  const todos = snapshot.docs.map(normalizeTodo);
  return includeDone ? todos : todos.filter((todo) => todo.status === "open");
}

async function completeTodo({ todoId, matchText, actorId = "unknown" }) {
  let ref = null;
  if (todoId) {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(String(todoId))) {
      throw validationError(400, "invalid_todo_id", "Geçerli bir todo kimliği gereklidir.");
    }
    ref = db.collection("agent_todos").doc(String(todoId));
  } else {
    const needle = String(matchText || "").trim().toLocaleLowerCase("tr-TR");
    if (!needle) throw validationError(400, "todo_match_required", "Tamamlanacak işi belirtin.");
    const open = await listTodos();
    const match = open.find((todo) => todo.title.toLocaleLowerCase("tr-TR").includes(needle))
      || open.find((todo) => needle.includes(todo.title.toLocaleLowerCase("tr-TR")));
    if (!match) throw validationError(404, "todo_not_found", "Eşleşen açık bir yapılacak iş bulunamadı.");
    ref = db.collection("agent_todos").doc(match.id);
  }

  const snapshot = await ref.get();
  if (!snapshot.exists) throw validationError(404, "todo_not_found", "Yapılacak iş kaydı bulunamadı.");
  await ref.set({
    status: "done",
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
    completedBy: actorId
  }, { merge: true });
  return { id: ref.id, title: (snapshot.data() || {}).title || "", status: "done" };
}

async function addEvent({ title, dateKey, time = null, actorId = "unknown", source = "admin_panel" }) {
  const safeTitle = String(title || "").trim().slice(0, MAX_TITLE) || "Etkinlik";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ""))) {
    throw validationError(400, "event_date_required", "Etkinlik için bir tarih gereklidir (örn. 'yarın 14:00 toplantı ekle').");
  }
  const safeTime = time && /^\d{2}:\d{2}$/.test(String(time)) ? String(time) : null;

  const ref = db.collection("agent_events").doc();
  await ref.set({
    title: safeTitle,
    dateKey: String(dateKey),
    time: safeTime,
    status: "scheduled",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: actorId,
    source
  });
  return { id: ref.id, title: safeTitle, dateKey: String(dateKey), time: safeTime };
}

async function listAgenda({ fromDateKey = null, toDateKey = null, now = new Date() } = {}) {
  const from = fromDateKey || dateKeyInTz(now);
  const to = toDateKey || addDaysKey(now, 14);
  const snapshot = await db.collection("agent_events")
    .where("dateKey", ">=", from)
    .where("dateKey", "<=", to)
    .orderBy("dateKey", "asc")
    .limit(AGENDA_LIMIT)
    .get();
  return snapshot.docs
    .map(normalizeEvent)
    .filter((event) => event.status !== "cancelled")
    .sort((a, b) => (a.dateKey + (a.time || "")).localeCompare(b.dateKey + (b.time || "")));
}

// "son gelen mesajın referansına Ahmet ismini ekle" → "Ahmet"
function extractNoteText(text) {
  let value = String(text || "");
  const colon = /(?<![0-9])[:—]\s*(.+)$/s.exec(value);
  if (colon && colon[1].trim()) return colon[1].trim().slice(0, MAX_TITLE);

  [
    /(son|latest|gelen|yeni)/gi,
    /(mesaj|message|lead|müşteri|musteri)[a-zçğıöşü]*/gi,
    /(\bnot\b|notu|notunu|referans|reference)[a-zçğıöşü]*/gi,
    /(ekle|yaz|kaydet|add|append|olarak)[a-zçğıöşü]*/gi,
    /(ismini|ismi|adını|adini|adı|adi|isim)[a-zçğıöşü]*/gi
  ].forEach((pattern) => { value = value.replace(pattern, " "); });
  return value.replace(/\s+/g, " ").replace(/^[,.\s]+|[,.\s]+$/g, "").trim().slice(0, MAX_TITLE);
}

async function addLeadNote({ text, noteOverride = null, actorId = "unknown" }) {
  // lazy require to avoid a circular import with lib/agent.js
  const { getLatestLeadMessage } = require("./agent");
  const lead = await getLatestLeadMessage();
  if (!lead) throw validationError(404, "lead_not_found", "Not eklenecek bir lead mesajı bulunamadı.");

  const note = String(noteOverride || "").trim().slice(0, MAX_TITLE)
    || extractNoteText(text)
    || String(text || "").trim().slice(0, MAX_TITLE);
  if (!note) throw validationError(400, "note_required", "Eklenecek not boş olamaz.");

  await db.collection("messages").doc(lead.id).set({
    agentNotes: admin.firestore.FieldValue.arrayUnion({
      text: note,
      addedBy: actorId,
      at: admin.firestore.Timestamp.now()
    }),
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  return { messageId: lead.id, leadName: lead.name || "Anonymous", note };
}

const SUPPORTED_ACTIONS_HELP = [
  "Şu an yapabildiklerim:",
  "• Son lead özeti + teklif taslağı — 'Son gelen mesajı özetle ve teklif taslağı hazırla'",
  "• Son lead'e not/referans ekleme — 'son gelen mesajın referansına Ahmet ekle'",
  "• Yapılacak iş ekle/listele/tamamla — 'todo ekle: müşteriye dön'",
  "• Ajandaya etkinlik ekle / ajandayı göster — 'yarın 14:00 toplantı ekle'"
].join("\n");

function formatTodoLines(todos) {
  if (!todos.length) return "Açık yapılacak iş yok.";
  return todos.map((todo, index) => `${index + 1}. ${todo.title}${todo.dueDateKey ? ` (son: ${todo.dueDateKey})` : ""}`).join("\n");
}

function formatAgendaLines(events) {
  if (!events.length) return "Ajandada yaklaşan etkinlik yok.";
  return events.map((event) => `• ${event.dateKey}${event.time ? ` ${event.time}` : ""} — ${event.title}`).join("\n");
}

function countOf(query) {
  return query.count().get().then((snapshot) => snapshot.data().count).catch(() => null);
}

function listOf(query, normalize) {
  return query.get().then((snapshot) => snapshot.docs.map(normalize)).catch(() => []);
}

function normalizeQuoteDoc(doc) {
  const data = doc.data() || {};
  return {
    quoteNumber: data.quoteNumber || doc.id,
    clientName: data.clientName || "Anonymous",
    totalPrice: data.totalPrice || 0,
    currency: data.currency || "TRY",
    status: data.status || "draft",
    createdAt: serializeTimestamp(data.createdAt)
  };
}

function normalizeProjectDoc(doc) {
  const data = doc.data() || {};
  return {
    projectNumber: data.projectNumber || doc.id,
    name: data.name || data.projectName || "Untitled Project",
    clientName: data.clientName || "Anonymous",
    status: data.status || "active",
    progress: data.progress || 0,
    workflowStage: data.workflowStage || null,
    budget: data.budget || 0,
    currency: data.currency || "TRY",
    dueDate: data.dueDate || null
  };
}

function normalizeClientDoc(doc) {
  const data = doc.data() || {};
  return {
    name: data.name || "Anonymous",
    email: maskEmail(data.email),
    totalMessages: data.totalMessages || 0,
    totalQuotes: data.totalQuotes || 0,
    totalProjects: data.totalProjects || 0,
    lastContactDate: serializeTimestamp(data.lastContactDate)
  };
}

// One consolidated snapshot of everything the admin panel shows, so the chat
// model answers from the same data the operator sees on screen.
async function collectPanelData() {
  const messagesCol = db.collection("messages");
  const quotesCol = db.collection("quotes");
  const projectsCol = db.collection("projects");

  const [
    messagesTotal, systemReports, trackerMessages, unreadAll,
    msgNew, msgQuoted, msgProjectCreated,
    quotesTotal, quotesDraft, quotesSent, quotesAccepted,
    clientsTotal, projectsTotal, projectsActive, projectsCompleted, visitorsTotal,
    recentQuotes, recentProjects, recentClients
  ] = await Promise.all([
    countOf(messagesCol),
    countOf(messagesCol.where("type", "==", "report")),
    countOf(messagesCol.where("email", "==", "tracker@taurus.sys")),
    countOf(messagesCol.where("read", "==", false)),
    countOf(messagesCol.where("status", "==", "new")),
    countOf(messagesCol.where("status", "==", "quoted")),
    countOf(messagesCol.where("status", "==", "project-created")),
    countOf(quotesCol),
    countOf(quotesCol.where("status", "==", "draft")),
    countOf(quotesCol.where("status", "==", "sent")),
    countOf(quotesCol.where("status", "==", "accepted")),
    countOf(db.collection("clients")),
    countOf(projectsCol),
    countOf(projectsCol.where("status", "==", "active")),
    countOf(projectsCol.where("status", "==", "completed")),
    countOf(db.collection("visitors_v1")),
    listOf(quotesCol.orderBy("createdAt", "desc").limit(5), normalizeQuoteDoc),
    listOf(projectsCol.orderBy("createdAt", "desc").limit(5), normalizeProjectDoc),
    listOf(db.collection("clients").orderBy("lastContactDate", "desc").limit(5), normalizeClientDoc)
  ]);

  const systemCount = Math.max(systemReports || 0, trackerMessages || 0);
  return {
    messages: {
      totalRecords: messagesTotal,
      systemRecords: systemCount,
      customerMessages: messagesTotal === null ? null : Math.max(0, messagesTotal - systemCount),
      unreadAllRecords: unreadAll,
      byStatus: { new: msgNew, quoted: msgQuoted, projectCreated: msgProjectCreated }
    },
    quotes: { total: quotesTotal, draft: quotesDraft, sent: quotesSent, accepted: quotesAccepted, recent: recentQuotes },
    projects: { total: projectsTotal, active: projectsActive, completed: projectsCompleted, recent: recentProjects },
    clients: { total: clientsTotal, recent: recentClients },
    visitors: { total: visitorsTotal }
  };
}

function formatDateShort(iso) {
  return iso ? new Date(iso).toLocaleDateString("tr-TR") : "?";
}

function formatPanelData(panel) {
  if (!panel) return "Panel verileri şu anda okunamıyor.";
  const value = (n) => (n === null || n === undefined ? "?" : n);
  const m = panel.messages || {};
  const lines = [
    `MESAJLAR (Inbox): müşteri mesajı ${value(m.customerMessages)} (durumlar → yeni: ${value(m.byStatus?.new)}, teklif verildi: ${value(m.byStatus?.quoted)}, projeye dönüştü: ${value(m.byStatus?.projectCreated)}). Toplam kayıt ${value(m.totalRecords)}, bunun ${value(m.systemRecords)} kadarı sistem/tracker kaydıdır (panelde görünmez). Okunmamış (tüm kayıtlar): ${value(m.unreadAllRecords)}.`,
    `TEKLİFLER (Proposals): toplam ${value(panel.quotes?.total)} → taslak: ${value(panel.quotes?.draft)}, gönderildi: ${value(panel.quotes?.sent)}, kabul edildi: ${value(panel.quotes?.accepted)}.`
  ];
  if (panel.quotes?.recent?.length) {
    lines.push("Son teklifler:");
    panel.quotes.recent.forEach((q) => lines.push(`• ${q.quoteNumber} — ${q.clientName} · ${q.totalPrice} ${q.currency} · ${q.status} · ${formatDateShort(q.createdAt)}`));
  }
  lines.push(`PROJELER: toplam ${value(panel.projects?.total)} → aktif: ${value(panel.projects?.active)}, tamamlandı: ${value(panel.projects?.completed)}.`);
  if (panel.projects?.recent?.length) {
    lines.push("Son projeler:");
    panel.projects.recent.forEach((p) => lines.push(`• ${p.projectNumber} — ${p.name} (${p.clientName}) · ${p.status} · %${p.progress} · aşama: ${p.workflowStage || "?"} · bütçe ${p.budget} ${p.currency}${p.dueDate ? ` · teslim ${p.dueDate}` : ""}`));
  }
  lines.push(`MÜŞTERİLER: toplam ${value(panel.clients?.total)}.`);
  if (panel.clients?.recent?.length) {
    lines.push("Son iletişimdeki müşteriler:");
    panel.clients.recent.forEach((c) => lines.push(`• ${c.name} (${c.email}) — ${c.totalMessages} mesaj, ${c.totalQuotes} teklif, ${c.totalProjects} proje · son iletişim ${formatDateShort(c.lastContactDate)}`));
  }
  lines.push(`ZİYARETÇİ İSTİHBARATI (Intelligence): kayıtlı ziyaretçi oturumu ${value(panel.visitors?.total)}.`);
  return lines.join("\n");
}

function formatRecentLeadLines(leads) {
  if (!leads || !leads.length) return "Kayıtlı lead mesajı yok.";
  return leads.map((lead) => {
    const when = lead.timestamp ? new Date(lead.timestamp).toLocaleString("tr-TR") : "tarih yok";
    return `• ${lead.name || "Anonymous"} (${maskEmail(lead.email)}) — ${lead.siteType || "?"} · ${when} · durum: ${lead.status || "new"}`;
  }).join("\n");
}

async function buildDailyContext(now = new Date()) {
  // lazy require avoids a circular import with lib/agent.js
  const agent = require("./agent");
  const [todos, agenda, recentLeads, approvals, panel] = await Promise.all([
    listTodos().catch(() => []),
    listAgenda({ now }).catch(() => []),
    agent.getRecentLeadMessages(5).catch(() => []),
    agent.listPendingApprovals().catch(() => []),
    collectPanelData().catch(() => null)
  ]);
  const todayKey = dateKeyInTz(now);
  return {
    todayKey,
    todos,
    agendaToday: agenda.filter((event) => event.dateKey === todayKey),
    agendaUpcoming: agenda,
    latestLead: recentLeads[0] || null,
    recentLeads,
    panel,
    pendingApprovals: approvals.length
  };
}

function formatLeadLine(lead) {
  if (!lead) return "Kayıtlı lead mesajı yok.";
  const when = lead.timestamp ? new Date(lead.timestamp).toLocaleString("tr-TR") : "tarih yok";
  const excerpt = String(lead.message || "").replace(/\s+/g, " ").trim().slice(0, 220);
  const lines = [
    `${lead.name || "Anonymous"} (${maskEmail(lead.email)}) — ${lead.siteType || "?"} · ${when}`,
    excerpt ? `Mesaj: "${excerpt}"` : "Mesaj metni boş."
  ];
  try {
    const { buildPricedProposal } = require("./pricing");
    const priced = buildPricedProposal(lead.pricingInput || lead);
    lines.push(
      `Seçilen kapsam: ${priced.siteType} · ${priced.designType} · ${priced.pageCount} sayfa · teslim ${priced.deliverySpeed} · bakım ${priced.maintenanceLevel}`,
      `Hesaplanan teklif tahmini: ${priced.totalPrice} ${priced.currency} (fiyat sürümü ${priced.pricingVersion})`
    );
  } catch (error) {
    lines.push("Fiyat tahmini hesaplanamadı.");
  }
  return lines.join("\n");
}

function deterministicChatReply(context, text = "") {
  // If the message reads like an action request we didn't recognize, say so
  // explicitly instead of answering with an unrelated briefing.
  const looksLikeAction = /(ekle|değiştir|degistir|güncelle|guncelle|kaydet|oluştur|olustur|gönder|gonder|yap\b|düzenle|duzenle)/i
    .test(String(text).toLocaleLowerCase("tr-TR"));
  if (looksLikeAction) {
    return `Bu isteği yerine getiremedim — bu işlem henüz desteklenmiyor.\n\n${SUPPORTED_ACTIONS_HELP}`;
  }

  const lines = [
    `Bugün ${context.todayKey}.`,
    "",
    formatPanelData(context.panel),
    "",
    "Son gelen lead:",
    formatLeadLine(context.latestLead),
    "",
    `Açık yapılacaklar (${context.todos.length}):`,
    formatTodoLines(context.todos.slice(0, 10)),
    "",
    "Bugünün ajandası:",
    formatAgendaLines(context.agendaToday)
  ];
  if (context.agendaUpcoming.length > context.agendaToday.length) {
    lines.push("", "Yaklaşanlar:", formatAgendaLines(context.agendaUpcoming.slice(0, 8)));
  }
  return lines.join("\n");
}

async function geminiChatReply(text, context, history) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      systemInstruction: [
        "Sen omeryigitler.com admin panelinin operasyon asistanısın.",
        "Panel bölümleri: Dashboard, Inbox (müşteri mesajları), Pricing, Proposals (teklifler), Clients (müşteriler), Projects (projeler), Intelligence (ziyaretçi istihbaratı), System.",
        "Türkçe, kısa ve net yanıt ver. Yalnızca sana verilen bağlamdaki verilere dayan.",
        "Mesaj sayısı sorulduğunda müşteri mesajı sayısını söyle; sistem/tracker kayıtlarını ayrıca belirt.",
        "Veri silme, ödeme veya kod değiştirme taleplerini kibarca reddet; onlar onaylı iş akışı ister.",
        `Bugün: ${context.todayKey}`,
        `PANEL VERİLERİ:\n${formatPanelData(context.panel)}`,
        `Son gelen lead mesajı:\n${formatLeadLine(context.latestLead)}`,
        `Son 5 müşteri mesajı:\n${formatRecentLeadLines(context.recentLeads)}`,
        `Bekleyen onay sayısı: ${context.pendingApprovals || 0}`,
        `Açık yapılacaklar:\n${formatTodoLines(context.todos.slice(0, 15))}`,
        `Yaklaşan ajanda:\n${formatAgendaLines(context.agendaUpcoming.slice(0, 15))}`,
        `Kullanıcı bir işlem yapmak isterse şu komut kalıplarını öner:\n${SUPPORTED_ACTIONS_HELP}`
      ].join("\n\n")
    });
    const contents = history.map((entry) => ({
      role: entry.role === "assistant" ? "model" : "user",
      parts: [{ text: entry.text }]
    }));
    contents.push({ role: "user", parts: [{ text }] });
    const result = await model.generateContent({ contents }, { timeout: 12000 });
    const reply = result?.response?.text?.();
    return reply ? String(reply).trim().slice(0, 4000) : null;
  } catch (error) {
    console.warn("[agent] Gemini chat unavailable, using deterministic reply:", error?.message);
    return null;
  }
}

async function dailyChat({ text, actorId = "unknown", now = new Date() }) {
  const todayKey = dateKeyInTz(now);
  const chats = db.collection("agent_chats");

  let history = [];
  try {
    const snapshot = await chats.where("dateKey", "==", todayKey).limit(60).get();
    history = snapshot.docs
      .map((doc) => ({ ...(doc.data() || {}), _ms: doc.data()?.createdAt?.toMillis?.() || 0 }))
      .sort((a, b) => a._ms - b._ms)
      .slice(-CHAT_CONTEXT_LIMIT)
      .map((entry) => ({ role: entry.role === "assistant" ? "assistant" : "user", text: String(entry.text || "").slice(0, 1500) }));
  } catch (error) {
    console.warn("[agent] chat history unavailable:", error?.message);
  }

  const context = await buildDailyContext(now);
  const reply = (await geminiChatReply(text, context, history)) || deterministicChatReply(context, text);

  try {
    const batch = db.batch();
    batch.set(chats.doc(), {
      role: "user", text: String(text).slice(0, 2000), dateKey: todayKey,
      actorId, createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    batch.set(chats.doc(), {
      role: "assistant", text: reply.slice(0, 4000), dateKey: todayKey,
      actorId: "agent", createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await batch.commit();
  } catch (error) {
    console.warn("[agent] chat log write failed:", error?.message);
  }

  return { reply, context: { openTodos: context.todos.length, eventsToday: context.agendaToday.length } };
}

async function recordTaskCommand({ command, actorId, intent, resultSummary }) {
  try {
    const batch = db.batch();
    const commandRef = db.collection("agent_commands").doc();
    batch.set(commandRef, {
      source: "admin_panel",
      text: command.text,
      normalizedIntent: intent,
      status: "completed",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: actorId,
      risk: "low"
    });
    batch.set(db.collection("agent_audit_logs").doc(), {
      actor: actorId,
      source: "agent",
      action: intent,
      targetType: intent === "lead_note" ? "messages" : intent.startsWith("todo") ? "agent_todos" : intent.startsWith("event") || intent === "agenda_list" ? "agent_events" : "agent_chats",
      targetId: null,
      risk: "low",
      result: "success",
      message: resultSummary,
      metadata: { commandId: commandRef.id },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    await batch.commit();
  } catch (error) {
    console.warn("[agent] task command audit write failed:", error?.message);
  }
}

const CLASSIFIABLE_INTENTS = new Set([
  INTENTS.LEAD_NOTE, INTENTS.TODO_ADD, INTENTS.TODO_COMPLETE,
  INTENTS.TODO_LIST, INTENTS.EVENT_ADD, INTENTS.AGENDA_LIST
]);

// The regex classifier misses free-form or typo'd Turkish ("Ahmet ekel");
// when it falls through to chat, ask Gemini to map the command onto a
// supported intent and extract its fields. Returns null when unsure.
async function geminiClassifyIntent(text, now = new Date()) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            intent: { type: SchemaType.STRING },
            noteText: { type: SchemaType.STRING },
            title: { type: SchemaType.STRING },
            dateKey: { type: SchemaType.STRING },
            time: { type: SchemaType.STRING }
          },
          required: ["intent"]
        }
      },
      systemInstruction: [
        "Türkçe admin komutlarını sınıflandırıyorsun. Yazım hatalarını tolere et.",
        "intent şunlardan biri olmalı: lead_note (son müşteri mesajına not/referans/isim ekleme),",
        "todo_add (yapılacak iş ekleme), todo_complete (yapılacak işi tamamlama), todo_list (yapılacakları listeleme),",
        "event_add (ajandaya/takvime etkinlik-toplantı-randevu ekleme), agenda_list (ajandayı gösterme), chat (hiçbiri / soru / sohbet).",
        "Alanları çıkar: noteText (eklenecek not metni), title (todo veya etkinlik başlığı, tarih/saat kelimeleri olmadan),",
        "dateKey (YYYY-MM-DD; 'bugün/yarın' gibi ifadeleri çevir), time (HH:MM).",
        `Bugünün tarihi: ${dateKeyInTz(now)}. Silme/değiştirme/ödeme istekleri için intent'i chat yap.`
      ].join("\n")
    });
    const result = await model.generateContent(String(text).slice(0, 1000));
    const parsed = JSON.parse(result?.response?.text?.() || "{}");
    if (!parsed || !CLASSIFIABLE_INTENTS.has(parsed.intent)) return null;
    return {
      intent: parsed.intent,
      noteText: typeof parsed.noteText === "string" ? parsed.noteText.trim() : "",
      title: typeof parsed.title === "string" ? parsed.title.trim() : "",
      dateKey: /^\d{4}-\d{2}-\d{2}$/.test(parsed.dateKey || "") ? parsed.dateKey : null,
      time: /^\d{2}:\d{2}$/.test(parsed.time || "") ? parsed.time : null
    };
  } catch (error) {
    console.warn("[agent] Gemini intent classification unavailable:", error?.message);
    return null;
  }
}

async function executeIntent(intent, text, extracted, actorId, now) {
  if (intent === INTENTS.LEAD_NOTE) {
    const noteResult = await addLeadNote({ text, noteOverride: extracted?.noteText || null, actorId });
    return {
      intent,
      message: `Son lead'e (${noteResult.leadName}) not eklendi: "${noteResult.note}"`,
      note: noteResult
    };
  }
  if (intent === INTENTS.TODO_ADD) {
    const parsed = parseTurkishDateTime(text, now);
    const title = extracted?.title || stripKeywords(text, [/(tamamla|bitir|done|complete)/gi]);
    const todo = await addTodo({ title, dueDateKey: extracted?.dateKey || parsed.dateKey, actorId });
    return { intent, message: `Yapılacaklara eklendi: ${todo.title}`, todo };
  }
  if (intent === INTENTS.TODO_COMPLETE) {
    const matchText = extracted?.title
      || stripKeywords(text, [/(tamamla|tamamlandı|tamamlandi|bitir|bitti|yapıldı|yapildi|done|complete|olarak|işaretle|isaretle)/gi]);
    const todo = await completeTodo({ matchText, actorId });
    return { intent, message: `Tamamlandı: ${todo.title}`, todo };
  }
  if (intent === INTENTS.TODO_LIST) {
    const todos = await listTodos();
    return { intent, message: formatTodoLines(todos), todos };
  }
  if (intent === INTENTS.EVENT_ADD) {
    const parsed = parseTurkishDateTime(text, now);
    const event = await addEvent({
      title: extracted?.title || stripKeywords(text),
      dateKey: extracted?.dateKey || parsed.dateKey,
      time: extracted?.time || parsed.time,
      actorId
    });
    return { intent, message: `Ajandaya eklendi: ${event.dateKey}${event.time ? ` ${event.time}` : ""} — ${event.title}`, event };
  }
  const events = await listAgenda({ now });
  return { intent: INTENTS.AGENDA_LIST, message: formatAgendaLines(events), events };
}

// Routes every non-proposal intent. Returns the payload sent back to the panel.
async function handleTaskCommand(command, actor, now = new Date()) {
  const actorId = actor?.id || "unknown";

  let intent = command.intent;
  let extracted = null;
  if (intent === INTENTS.DAILY_CHAT) {
    const classified = await geminiClassifyIntent(command.text, now);
    if (classified) {
      intent = classified.intent;
      extracted = classified;
    }
  }

  let result;
  if (intent === INTENTS.DAILY_CHAT) {
    const chat = await dailyChat({ text: command.text, actorId, now });
    result = { intent: INTENTS.DAILY_CHAT, message: chat.reply, chatContext: chat.context };
  } else {
    result = await executeIntent(intent, command.text, extracted, actorId, now);
  }

  await recordTaskCommand({
    command,
    actorId,
    intent: result.intent,
    resultSummary: String(result.message).slice(0, 300)
  });
  return { status: "completed", ...result };
}

module.exports = {
  addEvent,
  addTodo,
  completeTodo,
  dailyChat,
  handleTaskCommand,
  listAgenda,
  listTodos,
  _test: {
    dateKeyInTz,
    deterministicChatReply,
    extractNoteText,
    formatAgendaLines,
    formatTodoLines,
    parseTurkishDateTime,
    stripKeywords
  }
};
