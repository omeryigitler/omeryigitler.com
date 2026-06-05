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

(() => {
    const initExpertise3DCards = () => {
        const expertiseSection = document.getElementById('expertise');
        if (!expertiseSection || expertiseSection.dataset.oyCssVar3d === 'ready') return;

        const container = expertiseSection.querySelector('.grid.grid-cols-1.md\\:grid-cols-3');
        if (!container) return;

        const cards = Array.from(container.children).filter((el) => el instanceof HTMLElement).slice(0, 3);
        if (cards.length !== 3) return;

        expertiseSection.dataset.oyCssVar3d = 'ready';
        container.id = 'expertise-cards-container';
        container.style.setProperty('--scroll-progress', '0');

        cards[0].classList.add('expertise-card-3d', 'card-3d-left');
        cards[1].classList.add('expertise-card-3d', 'card-3d-center');
        cards[2].classList.add('expertise-card-3d', 'card-3d-right');

        const style = document.createElement('style');
        style.id = 'oy-css-var-expertise-3d';
        style.textContent = `
            /* --- 3D EXPERTISE CARDS / CSS VARIABLE VERSION --- */
            #expertise-cards-container {
                perspective: 1200px;
                perspective-origin: 50% 42%;
                transform-style: preserve-3d;
                overflow: visible;
            }

            #expertise-cards-container .expertise-card-3d {
                transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.3s ease, border-color 0.3s ease, background-color 0.3s ease;
                will-change: transform;
                transform-style: preserve-3d;
                backface-visibility: hidden;
                position: relative;
                z-index: 1;
            }

            #expertise-cards-container .card-3d-left {
                transform: translate3d(
                    calc(-100px * (1 - var(--scroll-progress, 0))),
                    0,
                    calc(-200px + (150px * var(--scroll-progress, 0)))
                ) rotateY(calc(45deg - (30deg * var(--scroll-progress, 0))));
            }

            #expertise-cards-container .card-3d-left:hover {
                transform: translate3d(0, -8px, 20px) rotateY(0deg) scale(1.05) !important;
                z-index: 20;
            }

            #expertise-cards-container .card-3d-center {
                z-index: 2;
                transform: translate3d(
                    0,
                    calc(100px * (1 - var(--scroll-progress, 0))),
                    calc(-50px + (100px * var(--scroll-progress, 0)))
                ) scale(calc(0.8 + (0.25 * var(--scroll-progress, 0))));
            }

            #expertise-cards-container .card-3d-center:hover {
                transform: translate3d(0, -10px, 80px) scale(1.1) !important;
                z-index: 20;
            }

            #expertise-cards-container .card-3d-right {
                transform: translate3d(
                    calc(100px * (1 - var(--scroll-progress, 0))),
                    0,
                    calc(-200px + (150px * var(--scroll-progress, 0)))
                ) rotateY(calc(-45deg + (30deg * var(--scroll-progress, 0))));
            }

            #expertise-cards-container .card-3d-right:hover {
                transform: translate3d(0, -8px, 20px) rotateY(0deg) scale(1.05) !important;
                z-index: 20;
            }

            @media (max-width: 767px) {
                #expertise-cards-container {
                    perspective: none;
                }

                #expertise-cards-container .expertise-card-3d,
                #expertise-cards-container .expertise-card-3d:hover {
                    transform: none !important;
                }
            }
        `;
        document.head.appendChild(style);

        let ticking = false;

        const update3DScroll = () => {
            if (window.innerWidth < 768) {
                container.style.setProperty('--scroll-progress', '1');
                ticking = false;
                return;
            }

            const rect = expertiseSection.getBoundingClientRect();
            const windowHeight = window.innerHeight || document.documentElement.clientHeight;
            const startScroll = windowHeight;
            const endScroll = windowHeight / 3;
            let progress = (startScroll - rect.top) / (startScroll - endScroll);

            progress = Math.max(0, Math.min(1, progress));
            container.style.setProperty('--scroll-progress', progress.toFixed(4));
            ticking = false;
        };

        const requestUpdate = () => {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(update3DScroll);
        };

        window.addEventListener('scroll', requestUpdate, { passive: true });
        window.addEventListener('resize', requestUpdate);
        update3DScroll();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initExpertise3DCards, { once: true });
    } else {
        initExpertise3DCards();
    }
})();
