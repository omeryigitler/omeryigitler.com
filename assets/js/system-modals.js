/**
 * System Modal Service
 * Replaces native alert() and confirm() with premium styled modals.
 */

window.systemAlert = (title, message, icon = 'info') => {
    return new Promise((resolve) => {
        const modal = document.getElementById('system-modal');
        const content = document.getElementById('system-modal-content');
        if (!modal || !content) {
            alert(message); // Fallback
            resolve();
            return;
        }

        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-message').innerText = message;

        const iconEl = document.getElementById('modal-icon');
        iconEl.setAttribute('data-lucide', icon);

        document.getElementById('modal-cancel-btn').classList.add('hidden');
        document.getElementById('modal-confirm-btn').innerText = 'OK';

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        // Use requestAnimationFrame for smoother entry on mobile
        requestAnimationFrame(() => {
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 50);
        });

        if (window.lucide) lucide.createIcons();

        const btn = document.getElementById('modal-confirm-btn');
        btn.onclick = () => {
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
            const res = confirm(message); // Fallback
            resolve(res);
            return;
        }

        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-message').innerText = message;

        const iconEl = document.getElementById('modal-icon');
        iconEl.setAttribute('data-lucide', icon);

        document.getElementById('modal-cancel-btn').classList.remove('hidden');
        document.getElementById('modal-confirm-btn').innerText = 'Confirm';

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        // Use requestAnimationFrame for smoother entry on mobile
        requestAnimationFrame(() => {
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 50);
        });

        if (window.lucide) lucide.createIcons();

        document.getElementById('modal-confirm-btn').onclick = () => {
            content.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                resolve(true);
            }, 300);
        };

        document.getElementById('modal-cancel-btn').onclick = () => {
            content.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                resolve(false);
            }, 300);
        };
    });
};
