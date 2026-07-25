const {
  issueAdminSession,
  sessionCookie,
} = require("./_gatewayAdminSession");

const ORIGIN = "https://omeryigitler.com";

function noStore(res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
}

function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    const params = new URLSearchParams(req.body);
    if (params.has("handoffToken")) {
      return Object.fromEntries(params.entries());
    }
    try {
      return JSON.parse(req.body);
    } catch (_) {
      return {};
    }
  }
  return req.body;
}

function safeReturn(value) {
  try {
    const target = new URL(String(value || "/admin.html"), ORIGIN);
    if (target.origin !== ORIGIN || target.pathname !== "/admin.html") return "/admin.html";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch (_) {
    return "/admin.html";
  }
}

module.exports = async (req, res) => {
  noStore(res);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  const body = readBody(req);
  const handoffToken = String(body.handoffToken || "");
  const verifier = String(body.verifier || "");
  const returnTo = safeReturn(body.return);

  if (!handoffToken || !verifier) {
    res.statusCode = 303;
    res.setHeader("Location", `/admin-gateway.html?return=${encodeURIComponent(returnTo)}`);
    return res.end();
  }

  try {
    const redeemResponse = await fetch(`${ORIGIN}/api/gateway-handoff?action=redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handoffToken,
        verifier,
        target: "admin",
      }),
    });
    const redeemed = await redeemResponse.json().catch(() => ({}));

    if (!redeemResponse.ok || !redeemed.verified) {
      throw new Error("Ticket redemption failed");
    }

    const provider = String(redeemed.provider || "telegram");
    const scope = String(redeemed.scope || "workspace");
    const maxAge = Math.min(
      Number(redeemed.sessionMaxAge || 0),
      provider === "passkey" ? 12 * 60 * 60 : 60 * 60,
    );

    if (
      !/^(?:passkey_admin_primary|telegram_admin_)/.test(String(redeemed.uid || "")) ||
      !["passkey", "telegram"].includes(provider) ||
      !["full", "workspace"].includes(scope) ||
      maxAge <= 0
    ) {
      throw new Error("Invalid redeemed identity");
    }

    const token = await issueAdminSession({
      uid: String(redeemed.uid),
      provider,
      scope,
      maxAge,
      req,
    });

    res.statusCode = 303;
    res.setHeader("Set-Cookie", sessionCookie(token, maxAge));
    res.setHeader("Location", returnTo);
    return res.end();
  } catch (error) {
    console.error("Admin session creation failed:", error);
    res.statusCode = 303;
    res.setHeader("Location", `/admin-gateway.html?return=${encodeURIComponent(returnTo)}`);
    return res.end();
  }
};
