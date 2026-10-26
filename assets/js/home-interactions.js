


        window.oyTypewriter(document.getElementById('typed'), [
            'drive business', 'convert visitors', 'rank on google', 'load instantly'
        ]);

        (function () {
            const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

            const revealTargets = document.querySelectorAll(
                ".contact-card, .support-strip, .center-head, section > .section-sub, .phil-sub, .phil-rule, .phil-cta"
            );

            if (!reduced && "IntersectionObserver" in window) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add("in");
                            observer.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.16 });

                revealTargets.forEach((el) => {
                    el.classList.add("reveal");
                    observer.observe(el);
                });
            }

            const typeTargets = document.querySelectorAll(".type-target");

            if (reduced || !("IntersectionObserver" in window)) {
                typeTargets.forEach((el) => { el.textContent = el.dataset.text; });
            } else {
                const typeLoop = (el) => {
                    const text = el.dataset.text || "";
                    let index = 0;
                    let deleting = false;

                    (function step() {
                        el.textContent = text.slice(0, index);

                        if (!deleting) {
                            if (index < text.length) {
                                index += 1;
                                setTimeout(step, 52 + Math.random() * 46);
                            } else {
                                deleting = true;
                                setTimeout(step, 2400);
                            }
                        } else {
                            if (index > 0) {
                                index -= 1;
                                setTimeout(step, 38);
                            } else {
                                deleting = false;
                                setTimeout(step, 600);
                            }
                        }
                    })();
                };

                const typeObserver = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            typeLoop(entry.target);
                            typeObserver.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.1 });

                typeTargets.forEach((el) => typeObserver.observe(el));
            }

            const philLines = Array.from(document.querySelectorAll(".phil-line"));
            if (!philLines.length || reduced) {
                philLines.forEach((line) => line.classList.add("lit"));
                return;
            }

            let rafPending = false;

            function updatePhilosophy() {
                rafPending = false;
                const center = window.innerHeight / 2;
                const range = window.innerHeight * 0.24;

                philLines.forEach((line) => {
                    const rect = line.getBoundingClientRect();
                    const distance = Math.abs(rect.top + rect.height / 2 - center);
                    line.classList.toggle("lit", distance < range);
                });
            }

            window.addEventListener("scroll", () => {
                if (!rafPending) {
                    rafPending = true;
                    requestAnimationFrame(updatePhilosophy);
                }
            }, { passive: true });

            updatePhilosophy();
        })();





        (function () {
            const form = document.getElementById("contactForm");
            const statusEl = document.getElementById("contactStatus");
            const cfg = document.getElementById("cfgModal");
            const ok = document.getElementById("okModal");
            if (!form || !cfg) return;

            const submitBtn = document.getElementById("cfgSubmit");
            const securityStatus = document.getElementById("cfgSecurityStatus");
            const turnstileMount = document.getElementById("turnstileMount");
            const config = { siteType: "LANDING", designType: "TEMPLATE", pageCount: 10, features: [], addons: [], deliverySpeed: "STANDARD", maintenanceLevel: "NONE" };
            const submitLabel = "Submit Final Request";
            let turnstileWidgetId = null;
            let turnstileLoader = null;
            let pendingSubmit = false;
            let pendingSubmitTimer = 0;
            window.__tsToken = "";

            // Warm the Turnstile script on the visitor's first interaction with the
            // form: by the time they open the configurator and press Submit, the
            // token is almost always already issued — no visible waiting.
            form.addEventListener("focusin", function warmOnce() {
                form.removeEventListener("focusin", warmOnce);
                loadTurnstileScript().catch(() => {});
            });

            function setStatus(msg, cls) {
                statusEl.textContent = msg;
                statusEl.className = "form-status" + (cls ? " " + cls : "");
            }
            function setSecurityStatus(message, isError) {
                if (!securityStatus) return;
                // the button label already narrates progress; reserve this line for errors
                securityStatus.textContent = isError ? message : "";
                securityStatus.classList.toggle("is-error", !!isError);
            }
            function setTurnstileToken(token) {
                window.__tsToken = String(token || "");
                if (window.__tsToken) {
                    setSecurityStatus("", false);
                    if (pendingSubmit) {
                        // The visitor already pressed Submit while the check was
                        // finishing — complete their request right away.
                        pendingSubmit = false;
                        clearTimeout(pendingSubmitTimer);
                        doSubmit(window.__tsToken);
                        return;
                    }
                    submitBtn.disabled = false;
                    submitBtn.textContent = submitLabel;
                }
            }
            function invalidateTurnstile(message) {
                window.__tsToken = "";
                pendingSubmit = false;
                clearTimeout(pendingSubmitTimer);
                // keep the button clickable: without a token a click only restarts
                // the security check, it can never submit the form
                submitBtn.disabled = false;
                submitBtn.textContent = "Retry Security Check";
                setSecurityStatus(message || "Security check must be completed again.", true);
            }
            function resetTurnstile(message) {
                invalidateTurnstile(message);
                if (window.turnstile && turnstileWidgetId !== null) {
                    try { window.turnstile.reset(turnstileWidgetId); } catch (error) {}
                }
            }
            function renderTurnstile() {
                if (!turnstileMount || !window.turnstile || turnstileWidgetId !== null) return;
                try {
                    turnstileWidgetId = window.turnstile.render(turnstileMount, {
                        sitekey: "0x4AAAAAACbHCrGU00_mYxPM",
                        theme: "dark",
                        appearance: "interaction-only",
                        action: "contact",
                        callback: (token) => setTurnstileToken(token),
                        "expired-callback": () => invalidateTurnstile("Security check expired. Please verify again."),
                        "error-callback": () => invalidateTurnstile("Security check could not complete. Please retry.")
                    });
                    setSecurityStatus("Verifying secure connection...", false);
                } catch (error) {
                    setSecurityStatus("Security check could not start. Disable blockers for this site and retry.", true);
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Retry Security Check";
                }
            }
            // Downloads api.js without touching any UI state, so the script can be
            // warmed the moment the visitor starts typing in the form — long before
            // the configurator opens.
            function loadTurnstileScript() {
                if (window.turnstile) return Promise.resolve();
                if (turnstileLoader) return turnstileLoader;

                turnstileLoader = new Promise((resolve, reject) => {
                    const script = document.createElement("script");
                    const timeout = setTimeout(() => reject(new Error("turnstile_timeout")), 8000);
                    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
                    script.async = true;
                    script.defer = true;
                    script.onload = () => { clearTimeout(timeout); resolve(); };
                    script.onerror = () => { clearTimeout(timeout); reject(new Error("turnstile_load_failed")); };
                    document.head.appendChild(script);
                });
                turnstileLoader.catch(() => { turnstileLoader = null; });
                return turnstileLoader;
            }

            function ensureTurnstile() {
                // the button stays ready — verification runs quietly in the background
                loadTurnstileScript().then(() => {
                    renderTurnstile();
                }).catch(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Retry Security Check";
                    setSecurityStatus("Security verification was blocked. Allow challenges.cloudflare.com or contact info@omeryigitler.com.", true);
                });
            }
            const modalOrigins = new WeakMap();
            const focusable = el => [...el.querySelectorAll('a[href],button,input,textarea,select,iframe,[tabindex]')]
                .filter(node => !node.disabled && node.tabIndex >= 0 && node.getClientRects().length);
            function openModal(el) {
                modalOrigins.set(el, document.activeElement);
                el.classList.add("open");
                el.setAttribute("aria-hidden", "false");
                document.body.style.overflow = "hidden";
                document.body.classList.add("cfg-modal-open");
                const panel = el.querySelector('[role="dialog"]');
                panel.tabIndex = -1;
                (focusable(el)[0] || panel).focus({preventScroll:true});
                if (el === cfg) ensureTurnstile();
            }
            function closeModal(el) {
                el.classList.remove("open");
                el.setAttribute("aria-hidden", "true");
                document.body.style.overflow = "";
                document.body.classList.remove("cfg-modal-open");
                modalOrigins.get(el)?.focus({preventScroll:true});
            }
            document.addEventListener('keydown', event => {
                const modal = [cfg, ok].find(el => el?.classList.contains('open'));
                if (!modal || event.key !== 'Tab') return;
                const items = focusable(modal), first = items[0], last = items[items.length-1];
                if (!first) { event.preventDefault(); return; }
                if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
                    event.preventDefault(); last.focus();
                } else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
                    event.preventDefault(); first.focus();
                }
            });

            // type the section labels each time the configurator opens
            const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            const secLabels = [...cfg.querySelectorAll(".cfg-seclabel")];
            secLabels.forEach((el) => { el.dataset.text = el.dataset.text || el.textContent; });
            function typeSecLabels() {
                if (reducedMotion) { secLabels.forEach((el) => { el.textContent = el.dataset.text; }); return; }
                secLabels.forEach((el, idx) => {
                    const text = el.dataset.text;
                    let i = 0;
                    el.textContent = "";
                    // start after the modal-open animation so the typing is clearly visible, stagger each line
                    setTimeout(function step() {
                        el.textContent = text.slice(0, i);
                        if (i < text.length) { i += 1; setTimeout(step, 45 + Math.random() * 35); }
                    }, 360 + idx * 520);
                });
            }

            // client-side rate limit (3 submissions / hour) — mirrors the old site
            const RATE_LIMIT = 3, WINDOW_MS = 60 * 60 * 1000;
            function rateBlockedMinutes() {
                const now = Date.now();
                let subs = [];
                try { const saved = JSON.parse(localStorage.getItem("formSubmissions") || "[]"); subs = Array.isArray(saved) ? saved.filter(Number.isFinite) : []; } catch (e) {}
                subs = subs.filter((t) => now - t < WINDOW_MS);
                try { localStorage.setItem("formSubmissions", JSON.stringify(subs)); } catch (e) { /* Storage may be unavailable; the API enforces its own limit. */ }
                if (subs.length >= RATE_LIMIT) return Math.ceil((WINDOW_MS - (now - Math.min(...subs))) / 60000);
                return 0;
            }
            function recordSubmission() {
                let subs = [];
                try { const saved = JSON.parse(localStorage.getItem("formSubmissions") || "[]"); subs = Array.isArray(saved) ? saved.filter(Number.isFinite) : []; } catch (e) {}
                subs.push(Date.now());
                try { localStorage.setItem("formSubmissions", JSON.stringify(subs)); } catch (e) { /* Storage may be unavailable; the API enforces its own limit. */ }
            }

            // nav CTA → jump to the contact form and focus the first field
            const navStart = document.getElementById("navStartProject");
            if (navStart) {
                navStart.addEventListener("click", () => {
                    const contact = document.getElementById("contact");
                    if (contact) contact.scrollIntoView({ behavior: "smooth", block: "start" });
                    setTimeout(() => { try { form.elements.namedItem("name").focus({ preventScroll: true }); } catch (error) {} }, 650);
                });
            }

            // step 1 → open configurator (validate basics first)
            form.addEventListener("submit", (e) => {
                e.preventDefault();
                // honeypot: a filled hidden field means a bot — fake success, drop silently
                if (form.website && form.website.value) {
                    setStatus("✓ Message sent — I'll get back to you soon.", "ok");
                    form.reset();
                    return;
                }
                if (!form.elements.namedItem("name").value.trim() || !form.email.value.trim() || !form.message.value.trim()) {
                    setStatus("Please fill in name, email and project details first.", "err");
                    return;
                }
                // mobile keyboards can sneak spaces/autocorrect into the address;
                // strip all whitespace, then validate the format before step 2
                form.email.value = form.email.value.replace(/\s+/g, "");
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value)) {
                    setStatus("Please enter a valid email address (e.g. name@example.com).", "err");
                    return;
                }
                const waitMin = rateBlockedMinutes();
                if (waitMin > 0) {
                    setStatus("Security limit reached — please try again in " + waitMin + " min.", "err");
                    return;
                }
                setStatus("", "");
                openModal(cfg);
                typeSecLabels();
            });

            // single-select chips (siteType, designType)
            cfg.querySelectorAll('.chip-grid[data-group]').forEach((grid) => {
                const group = grid.dataset.group;
                grid.querySelectorAll(".chip").forEach((chip) => {
                    chip.setAttribute("aria-pressed", chip.classList.contains("is-on"));
                    chip.addEventListener("click", () => {
                        grid.querySelectorAll(".chip").forEach((c) => { c.classList.remove("is-on"); c.setAttribute("aria-pressed", "false"); });
                        chip.classList.add("is-on");
                        chip.setAttribute("aria-pressed", "true");
                        config[group] = chip.dataset.value;
                    });
                });
            });

            // multi-select checks (features, addons)
            cfg.querySelectorAll('.check-grid[data-group]').forEach((grid) => {
                const group = grid.dataset.group;
                grid.querySelectorAll(".check").forEach((chk) => {
                    chk.setAttribute("aria-pressed", chk.classList.contains("is-on"));
                    chk.addEventListener("click", () => {
                        chk.classList.toggle("is-on");
                        chk.setAttribute("aria-pressed", chk.classList.contains("is-on"));
                        config[group] = [...grid.querySelectorAll(".check.is-on")].map((c) => c.dataset.value);
                    });
                });
            });

            // range
            const range = document.getElementById("pageCount");
            const rangeVal = document.getElementById("pageCountVal");
            range.addEventListener("input", () => {
                config.pageCount = Number(range.value);
                rangeVal.textContent = range.value + (range.value >= 50 ? "+ pages" : " pages");
            });

            // Custom listboxes support pointer, keyboard and announced selection.
            const dropdowns = [...cfg.querySelectorAll('.dd[data-group]')];
            const closeDropdown = dd => {
                dd.classList.remove('open');
                dd.querySelector('.dd-trigger').setAttribute('aria-expanded', 'false');
            };
            dropdowns.forEach(dd => {
                const group = dd.dataset.group, trigger = dd.querySelector('.dd-trigger');
                const label = dd.querySelector('.dd-label'), menu = dd.querySelector('.dd-menu');
                const options = [...menu.querySelectorAll('li')];
                trigger.id = `trigger-${group}`;
                trigger.setAttribute('aria-haspopup', 'listbox');
                trigger.setAttribute('aria-expanded', 'false');
                trigger.setAttribute('aria-controls', `options-${group}`);
                trigger.setAttribute('aria-label', `${group === 'deliverySpeed' ? 'Timeline' : 'Monthly maintenance'}: ${label.textContent}`);
                menu.id = `options-${group}`;
                menu.setAttribute('aria-labelledby', trigger.id);
                options.forEach(option => {
                    option.setAttribute('role', 'option'); option.tabIndex = -1;
                    option.setAttribute('aria-selected', option.dataset.value === config[group]);
                    option.addEventListener('click', event => {
                        event.stopPropagation();
                        config[group] = option.dataset.value;
                        label.textContent = option.textContent;
                        trigger.setAttribute('aria-label', `${group === 'deliverySpeed' ? 'Timeline' : 'Monthly maintenance'}: ${label.textContent}`);
                        options.forEach(item => {
                            item.classList.toggle('is-selected', item === option);
                            item.setAttribute('aria-selected', item === option);
                        });
                        closeDropdown(dd); trigger.focus();
                    });
                });
                const open = () => {
                    dropdowns.filter(other => other !== dd).forEach(closeDropdown);
                    dd.classList.add('open'); trigger.setAttribute('aria-expanded', 'true');
                    (options.find(option => option.dataset.value === config[group]) || options[0]).focus();
                };
                trigger.addEventListener('click', event => {
                    event.stopPropagation();
                    if (dd.classList.contains('open')) closeDropdown(dd); else open();
                });
                dd.addEventListener('keydown', event => {
                    if (event.key === 'Escape' && dd.classList.contains('open')) {
                        event.preventDefault(); event.stopPropagation(); closeDropdown(dd); trigger.focus(); return;
                    }
                    if (event.key === 'Tab') { closeDropdown(dd); return; }
                    if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
                        event.preventDefault();
                        if (!dd.classList.contains('open')) { open(); return; }
                        const current = options.indexOf(document.activeElement);
                        const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length-1 :
                            (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
                        options[next].focus();
                    } else if ((event.key === 'Enter' || event.key === ' ') && options.includes(document.activeElement)) {
                        event.preventDefault(); document.activeElement.click();
                    }
                });
                dd.addEventListener('focusout', event => { if (!dd.contains(event.relatedTarget)) closeDropdown(dd); });
            });
            cfg.addEventListener('click', () => dropdowns.forEach(closeDropdown));

            // close controls
            document.getElementById("cfgClose").addEventListener("click", () => closeModal(cfg));
            document.getElementById("cfgBack").addEventListener("click", () => closeModal(cfg));
            cfg.addEventListener("click", (e) => { if (e.target === cfg) closeModal(cfg); });

            // final submit
            async function doSubmit(token) {
                const payload = {
                    name: form.elements.namedItem("name").value.trim(),
                    email: form.email.value.replace(/\s+/g, ""),
                    message: form.message.value.trim(),
                    website: form.website ? form.website.value : "",
                    config: config,
                    turnstileToken: token
                };
                submitBtn.disabled = true;
                submitBtn.textContent = "Processing...";
                setSecurityStatus("Sending your request securely...", false);
                try {
                    const res = await fetch("/api/contact", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });
                    const out = await res.json().catch(() => ({}));
                    if (res.ok && out.ok) {
                        if (window.taurus_set_internal) window.taurus_set_internal();
                        // Customer receipt + owner notification are sent server-side (Resend).
                        recordSubmission();
                        closeModal(cfg);
                        form.reset();
                        rangeVal.textContent = "10 pages";
                        window.__tsToken = "";
                        if (window.turnstile && turnstileWidgetId !== null) { try { window.turnstile.reset(turnstileWidgetId); } catch (error) {} }
                        submitBtn.textContent = submitLabel;
                        setSecurityStatus("Security check loads when this step opens.", false);
                        if (ok) openModal(ok);
                    } else {
                        resetTurnstile(out.error || "The request could not be sent. Please retry.");
                        submitBtn.textContent = "Retry Security Check";
                    }
                } catch (err) {
                    resetTurnstile("Network connection failed. Please check your connection and retry.");
                    submitBtn.textContent = "Retry Security Check";
                } finally {
                    if (submitBtn.textContent === "Processing...") {
                        submitBtn.textContent = submitLabel;
                        submitBtn.disabled = false;
                    }
                }
            }

            submitBtn.addEventListener("click", () => {
                const token = window.__tsToken || "";
                if (token) {
                    doSubmit(token);
                    return;
                }

                // No token yet: finish the security check in the background and
                // submit automatically the moment it lands — one click, no retry.
                pendingSubmit = true;
                submitBtn.disabled = true;
                submitBtn.textContent = "Verifying security...";
                setSecurityStatus("", false);

                if (window.turnstile && turnstileWidgetId !== null) {
                    try { window.turnstile.reset(turnstileWidgetId); } catch (error) { turnstileWidgetId = null; }
                }
                if (turnstileWidgetId === null) ensureTurnstile();

                clearTimeout(pendingSubmitTimer);
                pendingSubmitTimer = setTimeout(() => {
                    if (!pendingSubmit) return;
                    invalidateTurnstile("Security check is taking longer than expected. Please retry.");
                }, 15000);
            });

            if (ok) {
                document.getElementById("okClose").addEventListener("click", () => closeModal(ok));
                ok.addEventListener("click", (e) => { if (e.target === ok) closeModal(ok); });
            }

            document.addEventListener("keydown", (e) => {
                if (e.key !== "Escape") return;
                if (cfg.classList.contains("open")) closeModal(cfg);
                if (ok && ok.classList.contains("open")) closeModal(ok);
            });
        })();

        (function () {
            const grid = document.getElementById("expertiseCards");
            if (!grid) return;

            const desktop = window.matchMedia("(min-width: 768px)");
            const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            const lerp = (a, b, t) => a + (b - a) * t;

            const cards = ["left", "center", "right"].map((pos) => {
                const el = grid.querySelector('[data-pos="' + pos + '"]');
                return { pos, el, hover: 0, hoverTarget: 0 };
            });

            document.addEventListener("pointermove", (event) => {
                const overEl = event.target && event.target.closest ? event.target.closest(".ecard") : null;

                cards.forEach((card) => {
                    const over = overEl === card.el;
                    if (over !== (card.hoverTarget === 1)) {
                        card.hoverTarget = over ? 1 : 0;
                        card.el.classList.toggle("is-hover", over);
                    }
                });
            }, { passive: true });

            console.log("[expertise-3d] ready — desktop:", desktop.matches, "| reduced:", reduced, "| viewport:", window.innerWidth + "x" + window.innerHeight);

            if (reduced) return;

            let last = performance.now();

            function frame(now) {
                const dt = Math.min(0.05, (now - last) / 1000);
                last = now;

                if (!desktop.matches) {
                    cards.forEach((card) => { card.el.style.transform = ""; });
                    requestAnimationFrame(frame);
                    return;
                }

                const rect = grid.getBoundingClientRect();
                const vh = window.innerHeight;
                let p = (vh - rect.top) / (vh / 2 + rect.height / 2);
                p = Math.max(0, Math.min(1, p));

                cards.forEach((card) => {
                    card.hover += (card.hoverTarget - card.hover) * Math.min(1, dt * 9);
                    const h = card.hover;

                    if (card.pos === "center") {
                        const y = lerp(100, 0, p);
                        const zBase = lerp(-50, 50, p);
                        const sBase = lerp(0.8, 1.05, p);
                        const z = lerp(zBase, 80, h);
                        const s = lerp(sBase, 1.1, h);
                        card.el.style.transform =
                            "translateY(" + y.toFixed(1) + "px) translateZ(" + z.toFixed(1) + "px) scale(" + s.toFixed(3) + ")";
                    } else {
                        const sign = card.pos === "left" ? 1 : -1;
                        const x = lerp(-100 * sign, 0, p);
                        const zBase = lerp(-200, -50, p);
                        const rotBase = lerp(45 * sign, 15 * sign, p);
                        const z = lerp(zBase, 20, h);
                        const rot = lerp(rotBase, 0, h);
                        const s = lerp(1, 1.02, h);
                        card.el.style.transform =
                            "translateX(" + x.toFixed(1) + "px) translateZ(" + z.toFixed(1) + "px) rotateY(" + rot.toFixed(2) + "deg) scale(" + s.toFixed(3) + ")";
                    }
                });

                requestAnimationFrame(frame);
            }

            requestAnimationFrame(frame);
        })();
