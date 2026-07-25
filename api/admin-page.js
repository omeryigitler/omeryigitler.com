const { verifyAdminSession } = require("./_gatewayAdminSession");

const ADMIN_SOURCE_URL = "https://raw.githubusercontent.com/omeryigitler/omeryigitler.com/main/admin.html";

function escapeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.setHeader("Referrer-Policy", "no-referrer");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("Method Not Allowed");
  }

  const session = await verifyAdminSession(req);
  if (!session) {
    res.statusCode = 302;
    res.setHeader("Location", "/admin-gateway.html?return=%2Fadmin.html");
    return res.end();
  }

  try {
    const sourceResponse = await fetch(`${ADMIN_SOURCE_URL}?v=${Date.now()}`, {
      headers: { "User-Agent": "Taurus-Admin-Gateway/1.0" },
      cache: "no-store",
    });
    if (!sourceResponse.ok) throw new Error(`Admin source unavailable: ${sourceResponse.status}`);
    let html = await sourceResponse.text();

    const sessionData = {
      provider: session.provider,
      scope: session.scope,
      expiresAt: session.expiresAtMs,
    };

    const bootstrap = `
<script>
  sessionStorage.setItem('authToken', 'valid');
  localStorage.removeItem('authToken');
  window.__TAURUS_GATEWAY_SESSION__ = ${escapeJson(sessionData)};
</script>`;

    const scopeGuard = `
<style>
  body.taurus-workspace-session #nav-settings,
  body.taurus-workspace-session [onclick*="switchTab('settings')"],
  body.taurus-workspace-session #tab-settings,
  body.taurus-workspace-session #settings-section {
    display: none !important;
  }
  .taurus-scope-badge {
    position: fixed; right: 18px; bottom: 18px; z-index: 99999;
    padding: 8px 12px; border: 1px solid rgba(255,215,0,.35);
    background: rgba(5,5,5,.9); color: #FFD700; border-radius: 999px;
    font: 700 9px/1 "JetBrains Mono", monospace; letter-spacing: .12em;
    text-transform: uppercase; pointer-events: none;
  }
</style>
<script>
  (function () {
    const gateway = window.__TAURUS_GATEWAY_SESSION__ || {};
    const isWorkspace = gateway.scope === 'workspace';

    function applyScope() {
      if (isWorkspace) {
        document.body.classList.add('taurus-workspace-session');
        document.querySelectorAll('#nav-settings,[onclick*="switchTab(\\'settings\\')"],#tab-settings,#settings-section')
          .forEach((element) => element.remove());
      }

      if (!document.querySelector('.taurus-scope-badge')) {
        const badge = document.createElement('div');
        badge.className = 'taurus-scope-badge';
        badge.textContent = isWorkspace ? 'Telegram / Workspace / 1H' : 'Passkey / Full / 12H';
        document.body.appendChild(badge);
      }
    }

    window.addEventListener('DOMContentLoaded', applyScope, { once: true });
    window.addEventListener('load', function () {
      applyScope();
      const originalSwitchTab = window.switchTab;
      if (typeof originalSwitchTab === 'function') {
        window.switchTab = function (tab) {
          if (isWorkspace && tab === 'settings') return false;
          return originalSwitchTab.apply(this, arguments);
        };
      }
      window.logout = function () {
        sessionStorage.removeItem('authToken');
        localStorage.removeItem('authToken');
        window.location.href = '/api/admin-logout';
      };
    }, { once: true });
  })();
</script>`;

    html = html.replace("</head>", `${bootstrap}</head>`);
    html = html.replace("</body>", `${scopeGuard}</body>`);

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.end(html);
  } catch (error) {
    console.error("Protected admin page failed:", error);
    return res.status(503).send("Admin page unavailable");
  }
};
