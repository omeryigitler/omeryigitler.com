// Credentials are provisioned only through server environment variables.
// Never read or write legacy security_config/telegram secrets in the browser.
let securitySettingsInitialized = false;
function initSecuritySettings() {
    if (securitySettingsInitialized) return;
    securitySettingsInitialized = true;
    for (const id of ['tele-token', 'tele-chat-id']) {
        const input = document.getElementById(id);
        if (input) { input.value = ''; input.disabled = true; input.placeholder = 'Yalnızca sunucuda yönetilir'; }
    }
}
