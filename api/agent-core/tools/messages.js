function isSystemMessage(data) {
  return data?.type === "report" || data?.email === "tracker@taurus.sys";
}

function serializeTimestamp(timestamp) {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000).toISOString();
  return null;
}

function normalizeMessage(doc) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    name: data.name || "Anonymous",
    email: data.email || "",
    phone: data.phone || null,
    company: data.company || null,
    country: data.country || "TR",
    siteType: data.siteType || data.projectType || null,
    projectType: data.projectType || data.siteType || null,
    pageCount: data.pageCount || null,
    designType: data.designType || null,
    deliverySpeed: data.deliverySpeed || null,
    maintenanceLevel: data.maintenanceLevel || null,
    selectedAddons: Array.isArray(data.selectedAddons) ? data.selectedAddons : [],
    status: data.status || "unknown",
    message: data.message || "",
    timestamp: serializeTimestamp(data.timestamp),
    raw: data
  };
}

async function getLatestLeadMessage(db) {
  const snapshot = await db.collection("messages")
    .orderBy("timestamp", "desc")
    .limit(20)
    .get();

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    if (!isSystemMessage(data)) return normalizeMessage(doc);
  }

  return null;
}

async function getUnreadLeadMessages(db, limit = 10) {
  const snapshot = await db.collection("messages")
    .orderBy("timestamp", "desc")
    .limit(Math.min(Math.max(Number(limit) || 10, 1), 25))
    .get();

  return snapshot.docs
    .filter((doc) => {
      const data = doc.data() || {};
      return !isSystemMessage(data) && data.status === "new";
    })
    .map(normalizeMessage);
}

module.exports = {
  isSystemMessage,
  getLatestLeadMessage,
  getUnreadLeadMessages
};
