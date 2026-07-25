const {
  clearSessionCookie,
  revokeAdminSession,
} = require("./_gatewayAdminSession");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");

  try {
    await revokeAdminSession(req);
  } catch (error) {
    console.error("Admin session revocation failed:", error);
  }

  res.statusCode = 303;
  res.setHeader("Set-Cookie", clearSessionCookie());
  res.setHeader("Location", "/admin-gateway.html?return=%2Fadmin.html");
  return res.end();
};
