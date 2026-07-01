const { admin } = require("../_firebaseAdmin");

function envList(name) {
  return String(process.env[name] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function authError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getHeader(req, name) {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(req.headers || {})) {
    if (key.toLowerCase() === target) return Array.isArray(value) ? value[0] : value;
  }
  return null;
}

async function verifyAgentRequest(req) {
  const configuredSecret = process.env.AGENT_API_SECRET;
  const providedSecret = getHeader(req, "x-agent-secret");

  if (configuredSecret && providedSecret && providedSecret === configuredSecret) {
    return {
      id: "agent_api_secret",
      uid: null,
      email: null,
      source: "api_secret",
      role: "server"
    };
  }

  const authHeader = getHeader(req, "authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);

  if (!match) {
    throw authError(401, "Missing Firebase ID token or agent secret");
  }

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(match[1]);
  } catch (error) {
    throw authError(401, "Invalid Firebase ID token");
  }

  const allowedUids = envList("AGENT_ADMIN_UIDS");
  const allowedEmails = envList("AGENT_ADMIN_EMAILS").map((email) => email.toLowerCase());
  const email = String(decoded.email || "").toLowerCase();

  const hasAdminClaim = decoded.admin === true || decoded.supervisor === true || decoded.role === "admin";
  const uidAllowed = allowedUids.includes(decoded.uid);
  const emailAllowed = email && allowedEmails.includes(email);
  const allowAnyFirebaseUser = process.env.AGENT_ALLOW_ANY_FIREBASE_USER === "true";

  if (!hasAdminClaim && !uidAllowed && !emailAllowed && !allowAnyFirebaseUser) {
    throw authError(403, "Firebase user is not authorized for agent actions");
  }

  return {
    id: decoded.uid,
    uid: decoded.uid,
    email: email || null,
    source: "firebase",
    role: hasAdminClaim ? "admin" : "allowed_user",
    claims: decoded
  };
}

module.exports = {
  verifyAgentRequest
};
