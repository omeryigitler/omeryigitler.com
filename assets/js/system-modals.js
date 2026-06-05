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

        const track = expertiseSection.querySelector('.grid.grid-cols-1.md\\:grid-cols-3');
        if (!track) return;

        const cards = Array.from(track.children).filter((el) => el instanceof HTMLElement).slice(0, 3);
        if (cards.length !== 3) return;

        expertiseSection.dataset.oyCssVar3d = 'ready';
        track.id = 'expertise-3d-track';
        track.style.setProperty('--scroll-progress', '0');

        cards.forEach((card) => {
            card.classList.remove('transition-all', 'duration-300', 'duration-500');
            card.classList.add('expertise-card-3d');
        });

        cards[0].classList.add('expertise-card-left');
        cards[1].classList.add('expertise-card-center');
        cards[2].classList.add('expertise-card-right');

        const style = document.createElement('style');
        style.id = 'oy-css-var-expertise-3d';
        style.textContent = `
            /* --- 3D EXPERTISE CARDS / ELEMENT-FROM-POINT HOVER VERSION --- */
            #expertise-3d-track {
                perspective: 1200px;
                perspective-origin: 50% 42%;
                transform-style: preserve-3d;
                overflow: visible;
            }

            #expertise-3d-track .expertise-card-3d {
                position: relative;
                z-index: 1;
                transform-style: preserve-3d;
                will-change: transform;
                backface-visibility: hidden;
                transition: box-shadow 0.3s ease, border-color 0.3s ease, background-color 0.3s ease;
            }

            #expertise-3d-track .expertise-card-left {
                transform: translate3d(
                    calc(-100px * (1 - var(--scroll-progress, 0))),
                    0,
                    calc(-200px + (150px * var(--scroll-progress, 0)))
                ) rotateY(calc(45deg - (30deg * var(--scroll-progress, 0))));
            }

            #expertise-3d-track .expertise-card-center {
                z-index: 2;
                transform: translate3d(
                    0,
                    calc(100px * (1 - var(--scroll-progress, 0))),
                    calc(-50px + (100px * var(--scroll-progress, 0)))
                ) scale(calc(0.8 + (0.25 * var(--scroll-progress, 0))));
            }

            #expertise-3d-track .expertise-card-right {
                transform: translate3d(
                    calc(100px * (1 - var(--scroll-progress, 0))),
                    0,
                    calc(-200px + (150px * var(--scroll-progress, 0)))
                ) rotateY(calc(-45deg + (30deg * var(--scroll-progress, 0))));
            }

            #expertise-3d-track .expertise-card-3d.is-hovered {
                transition: transform 0.38s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.3s ease, border-color 0.3s ease, background-color 0.3s ease;
                z-index: 20;
            }

            #expertise-3d-track .expertise-card-left.is-hovered,
            #expertise-3d-track .expertise-card-right.is-hovered {
                transform: translate3d(0, -8px, 70px) rotateY(0deg) scale(1.055) !important;
                box-shadow: 0 0 30px rgba(255, 215, 0, 0.13);
            }

            #expertise-3d-track .expertise-card-center.is-hovered {
                transform: translate3d(0, -10px, 90px) scale(1.08) !important;
                box-shadow: 0 0 40px rgba(59, 130, 246, 0.16);
            }

            @media (max-width: 767px) {
                #expertise-3d-track {
                    perspective: none;
                }

                #expertise-3d-track .expertise-card-3d,
                #expertise-3d-track .expertise-card-3d.is-hovered {
                    transform: none !important;
                    transition: none !important;
                }
            }
        `;
        document.head.appendChild(style);

        let ticking = false;
        let hoverTicking = false;
        let lastPointer = null;
        let activeCard = null;

        const setActiveCard = (card) => {
            if (card === activeCard) return;
            activeCard = card;
            cards.forEach((item) => item.classList.toggle('is-hovered', item === card));
        };

        const update3DScroll = () => {
            if (window.innerWidth < 768) {
                track.style.setProperty('--scroll-progress', '1');
                ticking = false;
                return;
            }

            const rect = track.getBoundingClientRect();
            const windowHeight = window.innerHeight || document.documentElement.clientHeight;
            let progress = (windowHeight * 0.85 - rect.top) / (windowHeight * 0.55);

            progress = Math.max(0, Math.min(1, progress));
            track.style.setProperty('--scroll-progress', progress.toFixed(4));
            ticking = false;
        };

        const requestUpdate = () => {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(update3DScroll);
        };

        const updateHoverFromPointer = () => {
            hoverTicking = false;
            if (!lastPointer || window.innerWidth < 768) {
                setActiveCard(null);
                return;
            }

            const hit = document.elementFromPoint(lastPointer.clientX, lastPointer.clientY);
            const card = hit && hit.closest ? hit.closest('#expertise-3d-track .expertise-card-3d') : null;
            setActiveCard(cards.includes(card) ? card : null);
        };

        const requestHoverUpdate = (event) => {
            lastPointer = event;
            if (hoverTicking) return;
            hoverTicking = true;
            window.requestAnimationFrame(updateHoverFromPointer);
        };

        document.addEventListener('pointermove', requestHoverUpdate, { passive: true });
        document.addEventListener('pointerleave', () => setActiveCard(null));
        window.addEventListener('blur', () => setActiveCard(null));
        window.addEventListener('scroll', () => {
            requestUpdate();
            if (lastPointer) requestHoverUpdate(lastPointer);
        }, { passive: true });
        window.addEventListener('resize', () => {
            requestUpdate();
            setActiveCard(null);
        });
        update3DScroll();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initExpertise3DCards, { once: true });
    } else {
        initExpertise3DCards();
    }
})();
