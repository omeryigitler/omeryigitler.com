const { admin, db } = require("./_firebaseAdmin");

const COLLECTION = "portfolio_projects";
const MAX_BODY_BYTES = 96 * 1024;
const ALLOWED_DISPLAY_TYPES = new Set(["desktop-mobile", "desktop-swap"]);

function sendJson(res, status, body, cache = "no-store") {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cache);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
}

function error(statusCode, code, message) {
  const value = new Error(message);
  value.statusCode = statusCode;
  value.code = code;
  return value;
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") {
    const serialized = JSON.stringify(req.body);
    if (Buffer.byteLength(serialized, "utf8") > MAX_BODY_BYTES) throw error(413, "body_too_large", "Request body is too large.");
    return req.body;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw error(413, "body_too_large", "Request body is too large.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw error(400, "invalid_json", "Request body must be valid JSON."); }
}

function cleanString(value, maxLength, fallback = "") {
  const normalized = typeof value === "string" ? value.trim() : fallback;
  return normalized.slice(0, maxLength);
}

function cleanId(value) {
  const id = cleanString(value, 100).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!id) throw error(400, "invalid_id", "A valid project id is required.");
  return id;
}

function cleanUrl(value, required = false) {
  const url = cleanString(value, 1000);
  if (!url && !required) return "";
  if (!url && required) throw error(400, "missing_url", "Project URL is required.");
  let parsed;
  try { parsed = new URL(url); }
  catch { throw error(400, "invalid_url", "Project URL must be a valid http or https URL."); }
  if (!new Set(["http:", "https:"]).has(parsed.protocol)) throw error(400, "invalid_url_protocol", "Project URL must use http or https.");
  return parsed.toString();
}

function cleanImage(value) {
  const image = cleanString(value, 1600);
  if (!image) return "";
  if (/^(javascript|data):/i.test(image)) throw error(400, "invalid_image", "Image path is not allowed.");
  return image;
}

function serializeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function sanitizeProject(input = {}) {
  const title = cleanString(input.title, 120);
  if (!title) throw error(400, "missing_title", "Project title is required.");
  const displayType = ALLOWED_DISPLAY_TYPES.has(input.displayType) ? input.displayType : "desktop-mobile";
  const sortOrder = Number(input.sortOrder);
  return {
    slug: cleanString(input.slug, 100),
    title,
    category: cleanString(input.category, 120, "Selected work"),
    kicker: cleanString(input.kicker, 120, "Custom digital experience"),
    challenge: cleanString(input.challenge, 1200),
    solution: cleanString(input.solution, 1200),
    result: cleanString(input.result, 1200),
    liveUrl: cleanUrl(input.liveUrl, true),
    desktopImage: cleanImage(input.desktopImage),
    mobileImage: cleanImage(input.mobileImage),
    alternateDesktopImage: cleanImage(input.alternateDesktopImage),
    alternateLabelA: cleanString(input.alternateLabelA, 60, "Primary"),
    alternateLabelB: cleanString(input.alternateLabelB, 60, "Alternate"),
    accent: /^#[0-9a-f]{6}$/i.test(String(input.accent || "")) ? String(input.accent) : "#FFD700",
    sortOrder: Number.isFinite(sortOrder) ? Math.max(-9999, Math.min(9999, Math.round(sortOrder))) : 999,
    displayType,
    published: input.published !== false,
    lang: cleanString(input.lang, 12)
  };
}

function serializeProject(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    slug: data.slug || doc.id,
    title: data.title || "Untitled Project",
    category: data.category || "Selected work",
    kicker: data.kicker || "Custom digital experience",
    challenge: data.challenge || "",
    solution: data.solution || "",
    result: data.result || "",
    liveUrl: data.liveUrl || "#",
    desktopImage: data.desktopImage || "assets/preview.png",
    mobileImage: data.mobileImage || "",
    alternateDesktopImage: data.alternateDesktopImage || "",
    alternateLabelA: data.alternateLabelA || "Primary",
    alternateLabelB: data.alternateLabelB || "Alternate",
    accent: data.accent || "#FFD700",
    sortOrder: Number.isFinite(Number(data.sortOrder)) ? Number(data.sortOrder) : 999,
    displayType: ALLOWED_DISPLAY_TYPES.has(data.displayType) ? data.displayType : "desktop-mobile",
    published: data.published !== false,
    lang: data.lang || "",
    capturedFrom: data.capturedFrom || "",
    captureUpdatedAt: serializeTimestamp(data.captureUpdatedAt)
  };
}

async function listProjects(includeHidden) {
  const snapshot = await db.collection(COLLECTION).get();
  return snapshot.docs.map(serializeProject).filter((project) => includeHidden || project.published).sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title));
}

async function verifyAdmin(req) {
  const agent = require("../lib/agent");
  return agent.verifyAgentRequest(req);
}

async function handlePost(req, res) {
  await verifyAdmin(req);
  const body = await readJson(req);
  const op = cleanString(body.op, 20).toLowerCase();

  if (op === "upsert") {
    const id = cleanId(body.id || body.project?.slug || body.project?.title);
    const project = sanitizeProject(body.project || {});
    const ref = db.collection(COLLECTION).doc(id);
    const existing = await ref.get();
    await ref.set({
      ...project,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() })
    }, { merge: true });
    return sendJson(res, 200, { ok: true, project: { id, ...project } });
  }

  if (op === "delete") {
    const id = cleanId(body.id);
    await db.collection(COLLECTION).doc(id).delete();
    return sendJson(res, 200, { ok: true, deletedId: id });
  }

  if (op === "seed") {
    const projects = Array.isArray(body.projects) ? body.projects.slice(0, 30) : [];
    if (!projects.length) throw error(400, "missing_projects", "Seed projects are required.");
    const batch = db.batch();
    const seeded = [];
    projects.forEach((item) => {
      const id = cleanId(item.id || item.slug || item.title);
      const project = sanitizeProject(item);
      batch.set(db.collection(COLLECTION).doc(id), { ...project, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      seeded.push(id);
    });
    await batch.commit();
    return sendJson(res, 200, { ok: true, seeded });
  }

  throw error(400, "unsupported_operation", "Unsupported portfolio operation.");
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const includeHidden = req.query?.includeHidden === "1";
      if (includeHidden) await verifyAdmin(req);
      const projects = await listProjects(includeHidden);
      return sendJson(res, 200, { ok: true, projects }, includeHidden ? "no-store" : "public, max-age=30, s-maxage=60, stale-while-revalidate=300");
    }
    if (req.method === "POST") return handlePost(req, res);
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { ok: false, code: "method_not_allowed", error: "Method not allowed." });
  } catch (cause) {
    console.error("[portfolio] request failed:", cause);
    const status = Number(cause?.statusCode || 500);
    return sendJson(res, status, {
      ok: false,
      code: cause?.code || (status >= 500 ? "internal_error" : "request_failed"),
      error: status >= 500 ? "Internal server error." : cause?.message || "Request failed."
    });
  }
};
