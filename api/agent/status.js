const { db } = require("../_firebaseAdmin");
const { sendJson, methodNotAllowed, errorResponse } = require("../agent-core/http");
const { verifyAgentRequest } = require("../agent-core/auth");

function serializeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value.seconds) return new Date(value.seconds * 1000).toISOString();
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

  try {
    await verifyAgentRequest(req);
    const snapshot = await db.collection("agent_approvals")
      .where("status", "==", "pending")
      .orderBy("requestedAt", "desc")
      .limit(20)
      .get();

    const approvals = snapshot.docs.map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        commandId: data.commandId || null,
        runId: data.runId || null,
        requestedAction: data.requestedAction || null,
        risk: data.risk || "medium",
        payloadPreview: data.payloadPreview || {},
        status: data.status || "pending",
        requestedAt: serializeTimestamp(data.requestedAt)
      };
    });

    return sendJson(res, 200, {
      ok: true,
      approvals
    });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return sendJson(res, status, body);
  }
};
