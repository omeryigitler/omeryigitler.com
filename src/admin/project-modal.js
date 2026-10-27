        // --- ADVANCED PROJECT MODAL LOGIC ---
        let currentProjectData = null; // Store for PDF generation
        let currentTab = 'overview';

        async function openProjectModal(id = null, providedDocs = null) {
            editingProjectId = id;
            pricingContextProjectId = id || null;
            const modal = document.getElementById('project-modal');
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';

            // Reset UI
            document.getElementById('project-form').reset();
            switchProjectTab('overview');
            document.getElementById('finance-breakdown-list').innerHTML = '<div class="text-center text-gray-500 py-10 italic">No financial data available.</div>';
            document.getElementById('finance-total-display').innerText = '---';

            if (id) {
                try {
                    const doc = await db.collection('projects').doc(id).get();
                    if (!doc.exists) return; // Should handle error
                    const d = doc.data();

                    // --- RACE CONDITION FIX ---
                    // If we just uploaded docs, Firestore reads might be stale. Use providedDocs override.
                    if (providedDocs) {
                        d.documents = { ...(d.documents || {}), ...providedDocs };
                    }

                    currentProjectData = { id, ...d }; // Store Globally
                    pricingContextMessageId = d.messageId || d.sourceMessageId || null;

                    // --- POPULATE HEADER ---
                    document.getElementById('p-header-id').innerText = '#' + (d.projectNumber || 'UNK');
                    document.getElementById('p-header-date').innerText = d.createdAt?.toDate().toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
                    document.getElementById('p-modal-title').innerText = (d.projectName || d.name || 'PROJECT').toUpperCase();

                    // --- POPULATE OVERVIEW TAB ---
                    document.getElementById('p-client').value = d.clientName || '';
                    document.getElementById('p-email').value = d.clientEmail || '';
                    document.getElementById('p-name').value = d.projectName || d.name || '';
                    document.getElementById('p-status').value = d.status || 'active';
                    document.getElementById('p-requests').value = d.description || d.requests || d.notes || ''; // Fallback chain
                    document.getElementById('p-delete-btn').classList.remove('hidden');

                    // TECH SPECS (From Breakdown or Description)
                    const specsDiv = document.getElementById('p-tech-specs');
                    if (d.siteType || (d.description && d.description.includes('--- TECHNICAL CONFIGURATION ---'))) {
                        specsDiv.classList.remove('hidden');
                        // Extract from structured fields (preferred) or parse description
                        document.getElementById('spec-site-type').innerText = d.siteType || extractVal(d.description, 'Project Type');
                        document.getElementById('spec-design-type').innerText = d.designType || extractVal(d.description, 'Design Style');
                        document.getElementById('spec-page-count').innerText = d.pageCount || extractVal(d.description, 'Page Count');
                        document.getElementById('spec-delivery').innerText = d.deliverySpeed || extractVal(d.description, 'Delivery');

                        // Addons
                        const addonsContainer = document.getElementById('spec-addons');
                        const addonsList = d.selectedAddons || extractVal(d.description || '', 'Addons').split(',').filter(x => x.trim().length > 0 && x !== 'N/A');

                        if (addonsList.length > 0) {
                            addonsContainer.innerHTML = addonsList.map(addon =>
                                `<span class="px-2 py-0.5 rounded bg-taurusGold/10 text-taurusGold text-[10px] font-bold border border-taurusGold/20">${typeof addon === 'string' ? addon.trim() : addon}</span>`
                            ).join('');
                        } else {
                            addonsContainer.innerHTML = '<span class="text-xs text-gray-500 italic">No add-ons selected</span>';
                        }
                    } else {
                        specsDiv.classList.add('hidden');
                    }

                    // --- POPULATE FINANCIALS TAB ---
                    renderFinancials(d.breakdown, d.currency);

                    // --- POPULATE ROADMAP TAB ---
                    renderRoadmap(d.roadmap, d.status);

                    // --- POPULATE WORKFLOW UI ---
                    setWorkflowUI(d.workflowStage || 'lead', !!d.finalApproved);

                    // --- POPULATE STUDIO TAB ---
                    const studio = d.studio || {};
                    const assets = studio.assets || {};
                    const setVal = (id, val) => {
                        const el = document.getElementById(id);
                        if (el) el.value = val || '';
                    };
                    const setCheck = (id, val) => {
                        const el = document.getElementById(id);
                        if (el) el.checked = !!val;
                    };
                    // Fold legacy studio fields into the single Brief box; saving
                    // migrates them there permanently.
                    const legacyParts = [
                        studio.goals && `Goals: ${studio.goals}`,
                        studio.audience && `Audience: ${studio.audience}`,
                        studio.tone && `Tone: ${studio.tone}`,
                        studio.keywords && `Keywords: ${studio.keywords}`,
                        studio.content && `Content: ${studio.content}`
                    ].filter(Boolean);
                    setVal('studio-brief', [studio.brief, ...legacyParts].filter(Boolean).join('\n\n'));
                    setVal('studio-references', studio.references);
                    setVal('studio-sitemap', studio.sitemap);
                    setVal('studio-notes', studio.notes);
                    setCheck('studio-asset-logo', assets.logo);
                    setCheck('studio-asset-brand', assets.brandbook);
                    setCheck('studio-asset-copy', assets.copy);
                    setCheck('studio-asset-images', assets.images);
                    setCheck('studio-asset-video', assets.video);

                    // --- POPULATE DOCUMENTS TAB ---
                    const quoteBtn = document.getElementById('btn-doc-quote');
                    const contractBtn = document.getElementById('btn-doc-contract');
                    const pricingData = {
                        customerName: d.clientName,
                        customerEmail: d.clientEmail,
                        country: d.country || 'TR',
                        siteType: d.siteType,
                        pageCount: d.pageCount,
                        designType: d.designType,
                        deliverySpeed: d.deliverySpeed,
                        maintenanceLevel: d.maintenanceLevel || 'NONE',
                        selectedAddons: d.selectedAddons || [],
                        breakdown: d.breakdown || {}
                    };
                    const payload = btoa(encodeURIComponent(JSON.stringify(pricingData)));

                    const quoteLocalKey = d.documents?.quoteLocalKey;
                    const localQuote = quoteLocalKey ? localStorage.getItem(quoteLocalKey) : null;
                    const quoteReady = !!(d.documents?.quoteReady || d.documents?.quoteGeneratedAt);
                    if (localQuote) {
                        quoteBtn.innerHTML = '<i data-lucide="download" class="w-4 h-4 mr-2 inline"></i> Download Proposal';
                        quoteBtn.className = 'w-full py-3 rounded-lg bg-taurusGold text-black border border-taurusGold/40 hover:bg-white font-bold text-xs uppercase tracking-widest transition-all';
                        quoteBtn.onclick = () => downloadBase64File(localQuote, `Quote_${d.projectNumber || 'Project'}.pdf`);
                    } else if (quoteReady) {
                        quoteBtn.innerHTML = '<i data-lucide="download" class="w-4 h-4 mr-2 inline"></i> Download Proposal';
                        quoteBtn.className = 'w-full py-3 rounded-lg bg-taurusGold text-black border border-taurusGold/40 hover:bg-white font-bold text-xs uppercase tracking-widest transition-all';
                        quoteBtn.onclick = () => generateProjectPDF('quote');
                    } else {
                        quoteBtn.innerHTML = '<i data-lucide="file-text" class="w-4 h-4 mr-2 inline"></i> Generate Proposal PDF';
                        quoteBtn.className = 'w-full py-3 rounded-lg bg-taurusGold/10 text-taurusGold border border-taurusGold/20 hover:bg-taurusGold hover:text-black font-bold text-xs uppercase tracking-widest transition-all';
                        quoteBtn.onclick = () => {
                            if (!pricingData.breakdown || !pricingData.breakdown.finalTotal) {
                                systemAlert('ERROR', 'Missing financial breakdown. Open pricing tool and save quote first.', 'x-circle');
                                return;
                            }
                            enqueuePdfJob({
                                id: `${editingProjectId}-quote-manual`,
                                projectId: editingProjectId,
                                docType: 'quote',
                                request: pricingData,
                                breakdown: pricingData.breakdown,
                                download: true,
                                fileName: `Quote_${d.projectNumber || 'Project'}.pdf`
                            });
                            systemAlert('DOC GENERATION', 'Generating proposal PDF...', 'loader-2');
                        };
                    }

                    const contractLocalKey = d.documents?.contractLocalKey;
                    const localContract = contractLocalKey ? localStorage.getItem(contractLocalKey) : null;
                    const contractReady = !!(d.documents?.contractReady || d.documents?.contractGeneratedAt);
                    if (localContract) {
                        contractBtn.innerHTML = '<i data-lucide="download" class="w-4 h-4 mr-2 inline"></i> Download Contract';
                        contractBtn.className = 'w-full py-3 rounded-lg bg-taurusGold text-black border border-taurusGold/40 hover:bg-white font-bold text-xs uppercase tracking-widest transition-all';
                        contractBtn.onclick = () => downloadBase64File(localContract, `Contract_${d.projectNumber || 'Project'}.pdf`);
                    } else if (contractReady) {
                        contractBtn.innerHTML = '<i data-lucide="download" class="w-4 h-4 mr-2 inline"></i> Download Contract';
                        contractBtn.className = 'w-full py-3 rounded-lg bg-taurusGold text-black border border-taurusGold/40 hover:bg-white font-bold text-xs uppercase tracking-widest transition-all';
                        contractBtn.onclick = () => generateProjectPDF('contract');
                    } else {
                        contractBtn.innerHTML = '<i data-lucide="scroll" class="w-4 h-4 mr-2 inline"></i> Generate Contract PDF';
                        contractBtn.className = 'w-full py-3 rounded-lg bg-taurusGold/10 text-taurusGold border border-taurusGold/20 hover:bg-taurusGold hover:text-black font-bold text-xs uppercase tracking-widest transition-all';
                        contractBtn.onclick = () => {
                            if (!pricingData.breakdown || !pricingData.breakdown.finalTotal) {
                                systemAlert('ERROR', 'Missing financial breakdown. Open pricing tool and save quote first.', 'x-circle');
                                return;
                            }
                            enqueuePdfJob({
                                id: `${editingProjectId}-contract-manual`,
                                projectId: editingProjectId,
                                docType: 'contract',
                                request: pricingData,
                                breakdown: pricingData.breakdown,
                                download: true,
                                fileName: `Contract_${d.projectNumber || 'Project'}.pdf`
                            });
                            systemAlert('DOC GENERATION', 'Generating contract PDF...', 'loader-2');
                        };
                    }

                } catch (e) {
                    console.error("Error opening project modal:", e);
                }
            } else {
                // New Project Mode
                currentProjectData = {};
                pricingContextProjectId = null;
                pricingContextMessageId = null;
                document.getElementById('p-modal-title').innerText = "NEW PROJECT";
                document.getElementById('p-header-id').innerText = "#NEW";
                document.getElementById('p-delete-btn').classList.add('hidden');
                document.getElementById('p-tech-specs').classList.add('hidden');
                setWorkflowUI('lead', false);
                const resetIds = [
                    'studio-brief',
                    'studio-goals',
                    'studio-audience',
                    'studio-tone',
                    'studio-keywords',
                    'studio-references',
                    'studio-sitemap',
                    'studio-content',
                    'studio-notes'
                ];
                resetIds.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = '';
                });
                ['studio-asset-logo', 'studio-asset-brand', 'studio-asset-copy', 'studio-asset-images', 'studio-asset-video']
                    .forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.checked = false;
                    });
            }
            lucide.createIcons();
        }

        function switchProjectTab(tabId) {
            currentTab = tabId;

            // Hide all content
            document.querySelectorAll('.project-tab-content').forEach(el => el.classList.add('hidden'));
            document.getElementById('tab-' + tabId).classList.remove('hidden');

            // Update buttons
            document.querySelectorAll('.project-tab-btn').forEach(btn => {
                btn.classList.remove('text-taurusGold', 'border-taurusGold', 'bg-white/5');
                btn.classList.add('text-gray-500', 'border-transparent');
            });
            const activeBtn = document.getElementById('tab-btn-' + tabId);
            activeBtn.classList.add('text-taurusGold', 'border-taurusGold', 'bg-white/5');
            activeBtn.classList.remove('text-gray-500', 'border-transparent');
        }

        function renderFinancials(breakdown, currency = 'TRY') {
            const container = document.getElementById('finance-breakdown-list');
            const totalDisplay = document.getElementById('finance-total-display');
            const currencyDisplay = document.getElementById('finance-currency');
            currencyDisplay.innerText = currency;

            if (!breakdown) {
                container.innerHTML = '<div class="text-center text-gray-500 py-10 italic">No financial data available (Manual Entry).</div>';
                totalDisplay.innerText = '---';
                return;
            }

            const formatMoney = (value) => formatAdminMoney(value, currency);

            let html = `
                <div class="flex justify-between py-2 border-b border-white/5">
                    <span class="text-gray-400">Base Price</span>
                    <span class="text-white font-mono">${formatMoney(breakdown.base)}</span>
                </div>
                <div class="flex justify-between py-2 border-b border-white/5">
                    <span class="text-gray-400">Page Cost</span>
                    <span class="text-white font-mono">${formatMoney(breakdown.pages)}</span>
                </div>
            `;

            // Specific Fields
            const fields = [
                { k: 'design', l: 'Design Premium' },
                { k: 'seo', l: 'SEO Module' },
                { k: 'multiLang', l: 'Multi-Language' },
                { k: 'graphics', l: 'Graphic Suite' },
                { k: 'ux', l: 'UX Optimization' },
                { k: 'crm', l: 'CRM Integration' },
                { k: 'addons', l: 'Extra Add-ons' },
                { k: 'speed', l: 'Urgency Fee' }
            ];

            fields.forEach(f => {
                if (breakdown[f.k] > 0) {
                    html += `
                        <div class="flex justify-between py-2 border-b border-white/5">
                            <span class="text-gray-400">${f.l}</span>
                            <span class="text-white font-mono">${formatMoney(breakdown[f.k])}</span>
                        </div>
                    `;
                }
            });

            // Discount
            if (breakdown.discountAmount > 0) {
                html += `
                    <div class="flex justify-between py-2 border-b border-white/5 bg-red-500/5 px-2 -mx-2 rounded">
                        <span class="text-red-400 font-bold">Discount Applied</span>
                        <span class="text-red-400 font-mono">-${formatMoney(breakdown.discountAmount)}</span>
                    </div>
                `;
            }

            container.innerHTML = html;
            totalDisplay.innerText = formatMoney(breakdown.finalTotal);
        }

        function renderRoadmap(roadmapData, projectStatus) {
            const container = document.getElementById('roadmap-container');

            // Default Timeline
            const phases = [
                { id: 'p_init', label: 'Initiation Protocol', sub: 'Proposal Signed, Deposit Cleared', icon: 'flag' },
                { id: 'p_design', label: 'Design & Architecture', sub: 'Wireframes, UI Approval', icon: 'pen-tool' },
                { id: 'p_dev', label: 'Core Development', sub: 'Frontend, Backend, Database', icon: 'code' },
                { id: 'p_qa', label: 'Quality Assurance', sub: 'Testing, Bug Fixes, Security', icon: 'shield-check' },
                { id: 'p_deploy', label: 'Live Deployment', sub: 'DNS, SSL, Final Handover', icon: 'rocket' }
            ];

            // If no data, assume first phase active
            const currentData = roadmapData || { p_init: { done: projectStatus !== 'pending', date: null } };

            let html = '';
            phases.forEach((phase, idx) => {
                const state = currentData[phase.id] || { done: false, date: null };
                const isLast = idx === phases.length - 1;
                const isDone = state.done;

                html += `
                    <div class="relative pl-12 group transition-all duration-300">
                        <!-- Line Connector -->
                        ${!isLast ? `<div class="absolute left-6 top-10 bottom-[-32px] w-0.5 ${isDone ? 'bg-taurusGold' : 'bg-white/10'} group-hover:bg-taurusGold/50 transition-colors"></div>` : ''}

                        <!-- Status Dot -->
                        <div onclick="togglePhase('${phase.id}')" class="absolute left-0 top-0 w-12 h-12 rounded-full border-2 ${isDone ? 'bg-taurusGold border-taurusGold text-black' : 'bg-black border-white/20 text-gray-500 hover:border-taurusGold hover:text-white'} flex items-center justify-center cursor-pointer transition-all z-10 shadow-lg">
                            <i data-lucide="${isDone ? 'check' : phase.icon}" class="w-5 h-5"></i>
                        </div>

                        <!-- Content -->
                        <div onclick="togglePhase('${phase.id}')" class="bg-white/5 border ${isDone ? 'border-taurusGold/30 bg-taurusGold/5' : 'border-white/5'} rounded-xl p-5 cursor-pointer hover:border-taurusGold/30 transition-all">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h4 class="text-sm font-bold ${isDone ? 'text-white' : 'text-gray-400'} uppercase tracking-wider">${phase.label}</h4>
                                    <p class="text-xs text-gray-500 mt-1">${phase.sub}</p>
                                </div>
                                ${isDone ? `<span class="text-[9px] font-mono text-taurusGold bg-taurusGold/10 px-2 py-1 rounded border border-taurusGold/20">${state.date ? new Date(state.date).toLocaleDateString() : 'COMPLETED'}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        }

        async function togglePhase(phaseId) {
            if (!editingProjectId || !currentProjectData) return;

            const currentRoadmap = currentProjectData.roadmap || {};
            const currentState = currentRoadmap[phaseId]?.done || false;

            // Toggle
            currentRoadmap[phaseId] = {
                done: !currentState,
                date: !currentState ? new Date().toISOString() : null
            };

            // Optimistic Update
            currentProjectData.roadmap = currentRoadmap;
            renderRoadmap(currentRoadmap, currentProjectData.status);

            // Save to DB
            try {
                await db.collection('projects').doc(editingProjectId).update({
                    roadmap: currentRoadmap
                });
                lucide.createIcons();
            } catch (e) { console.error("Roadmap save failed", e); }
        }

        function generateProjectPDF(type) {
            if (!editingProjectId || !currentProjectData) {
                systemAlert('ERROR', 'No project selected.', 'x-circle');
                return;
            }

            if (!currentProjectData.breakdown || !currentProjectData.breakdown.finalTotal) {
                systemAlert('ERROR', 'Missing financial breakdown. Open pricing tool and save quote first.', 'x-circle');
                return;
            }

            const request = {
                ...currentProjectData,
                customerName: currentProjectData.clientName,
                customerEmail: currentProjectData.clientEmail
            };

            const fileBase = type === 'quote' ? 'Quote' : 'Contract';
            const fileName = `${fileBase}_${currentProjectData.projectNumber || 'Project'}.pdf`;

            enqueuePdfJob({
                id: `${editingProjectId}-${type}-panel`,
                projectId: editingProjectId,
                docType: type,
                request,
                breakdown: currentProjectData.breakdown,
                download: true,
                fileName
            });

            systemAlert('DOC GENERATION', `Generating ${type.toUpperCase()}... Please wait.`, 'loader-2');
        }

        // Helper to extract value from formatted text
        function extractVal(text, key) {
            if (!text) return 'N/A';
            const regex = new RegExp(`• ${key}: (.*)`);
            const match = text.match(regex);
            return match ? match[1].trim() : 'N/A';
        }

        // Helper function to open project modal with pre-filled data (legacy wrapper)
        function openProjectModalWithData(data) {
            openProjectModal(null); // Open new
            document.getElementById('p-client').value = data.client || '';
            document.getElementById('p-email').value = data.email || '';
            document.getElementById('p-requests').value = data.requests || '';
        }

        function closeProjectModal() {
            editingProjectId = null; // Reset to avoid stale state
            document.getElementById('project-modal').classList.add('hidden');
            document.body.style.overflow = '';
        }

        async function saveProject() {
            // Spread the loaded studio first so legacy fields (goals, audience,
            // tone, keywords, content) survive even though the simplified Brief
            // tab no longer edits them.
            const studio = {
                ...((currentProjectData && currentProjectData.studio) || {}),
                brief: document.getElementById('studio-brief')?.value || '',
                references: document.getElementById('studio-references')?.value || '',
                sitemap: document.getElementById('studio-sitemap')?.value || '',
                notes: document.getElementById('studio-notes')?.value || '',
                // migrated into brief on load; cleared so they don't duplicate
                goals: '', audience: '', tone: '', keywords: '', content: '',
                assets: {
                    logo: document.getElementById('studio-asset-logo')?.checked || false,
                    brandbook: document.getElementById('studio-asset-brand')?.checked || false,
                    copy: document.getElementById('studio-asset-copy')?.checked || false,
                    images: document.getElementById('studio-asset-images')?.checked || false,
                    video: document.getElementById('studio-asset-video')?.checked || false
                }
            };

            const data = {
                clientName: document.getElementById('p-client').value,
                clientEmail: document.getElementById('p-email').value,
                projectName: document.getElementById('p-name').value,
                name: document.getElementById('p-name').value,
                status: document.getElementById('p-status').value,
                done: document.getElementById('p-done')?.value || '',
                todo: document.getElementById('p-todo')?.value || '',
                requests: document.getElementById('p-requests').value,
                description: document.getElementById('p-requests').value,
                studio: studio,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            const targetId = editingProjectId || pricingContextProjectId;
            if (targetId) {
                await db.collection('projects').doc(targetId).update(data);
            } else {
                await saveProjectToFirestore(data);
            }
            closeProjectModal();
        }

        async function deleteProject() {
            if (!editingProjectId) return;
            const confirmed = await systemConfirm('DELETE PROJECT', 'Are you sure you want to delete this project? All of its data will be removed.', 'alert-triangle');
            if (confirmed) {
                await db.collection('projects').doc(editingProjectId).delete();
                closeProjectModal();
            }
        }

        let currentProjectFilter = 'active';
        function filterProjects(s) {
            currentProjectFilter = s;
            document.getElementById('filter-active').className = s === 'active' ? 'h-full flex-1 justify-center px-6 rounded-lg text-[10px] font-black uppercase tracking-widest bg-taurusGold text-black transition-all whitespace-nowrap' : 'h-full flex-1 justify-center px-6 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all whitespace-nowrap';
            document.getElementById('filter-completed').className = s === 'completed' ? 'h-full flex-1 justify-center px-6 rounded-lg text-[10px] font-black uppercase tracking-widest bg-taurusGold text-black transition-all whitespace-nowrap' : 'h-full flex-1 justify-center px-6 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all whitespace-nowrap';
            loadProjects();
        }

        // Outside click close
        window.onclick = (e) => {
            if (e.target.id === 'message-modal') closeMessageModal();
            if (e.target.id === 'project-modal') closeProjectModal();
            if (e.target.id === 'session-modal') closeSessionModal();
        }
