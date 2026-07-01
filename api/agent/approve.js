const { admin, db } = require("../_firebaseAdmin");
const { readJson, sendJson, methodNotAllowed, errorResponse } = require("../agent-core/http");
const { verifyAgentRequest } = require("../agent-core/auth");
const { logAudit } = require("../agent-core/audit");
const { createApprovedProposal } = require("../agent-core/tools/proposals");

async function getPendingApproval(id) {
  if (!id) {
    const error = new Error("approvalId is required");
    error.statusCode = 400;
    throw error;
  }

  const ref = db.collection("agent_approvals").doc(id);
  const snap = await ref.get();

  if (!snap.exists) {
    const error = new Error("Approval not found");
    error.statusCode = 404;
    throw error;
  }

  const data = snap.data() || {};
  if (data.status !== "pending") {
    const error = new Error("Approval is not pending");
    error.statusCode = 409;
    throw error;
  }

  return { ref, data };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  try {
    const actor = await verifyAgentRequest(req);
    const body = await readJson(req);
    const decision = body.decision === "reject" ? "reject" : "approve";
    const { ref, data } = await getPendingApproval(body.approvalId);

    if (decision === "reject") {
      await ref.update({
        status: "rejected",
        decidedAt: admin.firestore.FieldValue.serverTimestamp(),
        decidedBy: actor.id
      });

      await logAudit(db, {
        actor: actor.id,
        source: "agent_approve",
        action: "approval_rejected",
        targetType: "agent_approval",
        targetId: ref.id,
        risk: data.risk || "medium",
        result: "success",
        message: "Agent approval was rejected."
      });

      return sendJson(res, 200, {
        ok: true,
        status: "rejected",
        approvalId: ref.id
      });
    }

    if (data.requestedAction !== "create_proposal") {
      const error = new Error("Unsupported approval action");
      error.statusCode = 400;
      throw error;
    }

    const result = await createApprovedProposal(db, data.payloadPreview, {
      approvalId: ref.id,
      commandId: data.commandId || null
    });

    await ref.update({
      status: "approved",
      decidedAt: admin.firestore.FieldValue.serverTimestamp(),
      decidedBy: actor.id,
      result
    });

    if (data.commandId) {
      await db.collection("agent_commands").doc(data.commandId).set({
        status: "completed",
        approvedBy: actor.id,
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    await logAudit(db, {
      actor: actor.id,
      source: "agent_approve",
      action: "approval_executed",
      targetType: result.collection,
      targetId: result.id,
      risk: data.risk || "medium",
      result: "success",
      message: "Agent approval was approved and executed.",
      metadata: {
        approvalId: ref.id,
        commandId: data.commandId || null
      }
    });

    return sendJson(res, 200, {
      ok: true,
      status: "approved",
      approvalId: ref.id,
      result
    });
  } catch (error) {
    const { status, body } = errorResponse(error);
    return sendJson(res, status, body);
  }
};
