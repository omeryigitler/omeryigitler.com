/**
 * System Modal Service
 * Replaces native alert() and confirm() with premium styled modals.
 */

window.systemAlert = (title, message, icon = 'info') => {
    return new Promise((resolve) => {
        const modal = document.getElementById('system-modal');
        const content = document.getElementById('system-modal-content');
        if (!modal || !content) {
            alert(message);
            resolve();
            return;
        }

        // Hard Reset
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');

        document.getElementById('modal-title').innerText = title || "SYSTEM ALERT";
        document.getElementById('modal-message').innerText = message || "";

        const iconEl = document.getElementById('modal-icon');
        iconEl.setAttribute('data-lucide', icon);

        // Dynamic Styling for Loaders
        if (icon.includes('loader') || icon.includes('upload') || icon.includes('refresh')) {
            iconEl.classList.add('animate-spin');
            document.getElementById('modal-confirm-btn').classList.add('hidden'); // Hide OK button for loaders
        } else {
            iconEl.classList.remove('animate-spin');
            document.getElementById('modal-confirm-btn').classList.remove('hidden');
        }

        document.getElementById('modal-cancel-btn').classList.add('hidden');
        document.getElementById('modal-confirm-btn').innerText = 'OK';

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        // Use requestAnimationFrame for smoother entry
        requestAnimationFrame(() => {
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 10);
        });

        if (window.lucide) lucide.createIcons();

        const btn = document.getElementById('modal-confirm-btn');
        btn.onclick = () => {
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                resolve();
            }, 300);
        };
    });
};

window.systemConfirm = (title, message, icon = 'help-circle') => {
    return new Promise((resolve) => {
        const modal = document.getElementById('system-modal');
        const content = document.getElementById('system-modal-content');
        if (!modal || !content) {
            const res = confirm(message);
            resolve(res);
            return;
        }

        // Hard Reset
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        content.classList.remove('scale-100', 'opacity-100');
        content.classList.add('scale-95', 'opacity-0');

        document.getElementById('modal-title').innerText = title || "CONFIRMATION REQUIRED";
        document.getElementById('modal-message').innerText = message || "";

        const iconEl = document.getElementById('modal-icon');
        iconEl.setAttribute('data-lucide', icon);

        document.getElementById('modal-cancel-btn').classList.remove('hidden');
        document.getElementById('modal-confirm-btn').innerText = 'Confirm';

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        requestAnimationFrame(() => {
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 10);
        });

        if (window.lucide) lucide.createIcons();

        document.getElementById('modal-confirm-btn').onclick = () => {
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                resolve(true);
            }, 300);
        };

        document.getElementById('modal-cancel-btn').onclick = () => {
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                resolve(false);
            }, 300);
        };
    });
};

(function loadAdminAgentBridge() {
    if (!/admin\.html$/.test(window.location.pathname)) return;
    window.addEventListener('load', function () {
        var script = document.createElement('script');
        script.src = 'assets/js/admin-agent.js?v=V1';
        script.defer = true;
        document.body.appendChild(script);
    });
})();
