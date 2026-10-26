        // --- REMOTE CONTROL DISPATCHER ---
        async function deleteSession(id) {
            const confirmed = await systemConfirm('DATA PURGE', 'Confirm permanent deletion of this session data? This action cannot be undone.', 'trash-2');
            if (confirmed) {
                try {
                    await db.collection('visitors_v1').doc(id).delete();
                    selectedVisitors.delete(id);
                    updateVisitorsBulkUI();
                } catch (e) { console.error("Deletion failed", e); }
            }
        }

        // Freeze with a custom on-screen message — prompts the admin, sends it verbatim
        function sendFreeze(visitorId) {
            const msg = window.prompt("Message to display on the visitor's frozen screen (leave empty for none):", "");
            if (msg === null) return; // cancelled
            sendRemoteCommand(visitorId, 'freeze', msg);
        }
        window.sendFreeze = sendFreeze;

        async function sendRemoteCommand(visitorId, action, message) {
            if (!db) return;
            try {
                // Visual feedback
                const btn = event && event.currentTarget;
                let originalContent = '';
                if (btn) {
                    originalContent = btn.innerHTML;
                    btn.innerHTML = '<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i>';
                    lucide.createIcons();
                }

                const update = {
                    action: action,
                    action_timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };
                // include the custom message for freeze (verbatim), clear it otherwise
                update.message = (action === 'freeze' && typeof message === 'string') ? message : null;

                await db.collection('visitors_v1').doc(visitorId).update(update);

                // Toast or Temp Success
                if (btn) {
                    btn.classList.add('bg-green-500', 'text-white');
                    setTimeout(() => {
                        btn.innerHTML = originalContent;
                        btn.classList.remove('bg-green-500', 'text-white');
                        lucide.createIcons();
                    }, 1500);
                }

                console.log(`📡 Command SENT: ${action} -> ${visitorId}`);
            } catch (e) {
                console.error("Command Failed", e);
                alert("Command Transmission Failed: " + e.message);
            }
        }

        // Session Modal Functions
        function openSessionModal(id) {
            const data = intelDataMap[id];
            const modal = document.getElementById('session-modal');
            const content = document.getElementById('session-details');

            if (!modal || !content || !data) return;

            // Build session details HTML
            const loc = data.location?.city || 'Unknown';
            const country = data.location?.country || 'Unknown';
            const countryCode = data.location?.country_code?.toLowerCase() || '';
            const flagHtml = countryCode ? `<img src="https://flagcdn.com/96x72/${countryCode}.png" class="w-12 h-9 rounded border border-white/10 shadow-lg" alt="${countryCode}" onerror="this.outerHTML='<span class=\'text-xs font-bold text-taurusGold\'>${countryCode.toUpperCase()}</span>'"/>` : '';

            let historyHtml = '';
            if (data.history && data.history.length > 0) {
                data.history.forEach((visit, idx) => {
                    // Robust Time Parsing
                    let time = 'N/A';
                    if (visit.timestamp) {
                        try {
                            time = new Date(visit.timestamp).toLocaleString('tr-TR', {
                                hour: '2-digit', minute: '2-digit', second: '2-digit'
                            });
                        } catch (e) { time = visit.time || 'Invalid Date'; }
                    } else {
                        time = visit.time || 'N/A';
                    }

                    const refInfo = getReferrerInfo(visit.referrer || 'Direct');

                    // Unified Display Logic
                    const displayPage = visit.page || visit.path || (visit.action === 'Navigation' ? visit.detail : visit.action) || '/unknown';
                    const displayTitle = visit.title || (visit.action !== 'Navigation' ? visit.detail : 'Untitled Page');

                    historyHtml += `
                        <div class="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-taurusGold/20 transition-all">
                            <div class="flex flex-col items-center gap-2">
                                <div class="w-8 h-8 rounded-full bg-taurusGold/20 border border-taurusGold flex items-center justify-center text-taurusGold font-bold text-xs">
                                    ${idx + 1}
                                </div>
                                ${idx < data.history.length - 1 ? '<div class="w-0.5 h-8 bg-taurusGold/20"></div>' : ''}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1">
                                    <i data-lucide="${visit.action === 'Navigation' ? 'globe' : 'mouse-pointer-2'}" class="w-4 h-4 text-gray-400"></i>
                                    <span class="text-white font-mono text-sm truncate">${displayPage}</span>
                                </div>
                                <p class="text-xs text-gray-500 mb-2 truncate">${displayTitle}</p>
                                <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-gray-600">
                                    <span class="flex items-center gap-1">⏰ ${time}</span>
                                    <span class="flex items-center gap-1.5 p-1 px-2.5 rounded-full bg-taurusGold/10 text-taurusGold border border-taurusGold/20 font-bold uppercase tracking-wider text-[9px]">
                                        <i data-lucide="${refInfo.icon}" class="w-2.5 h-2.5"></i>
                                        source: ${refInfo.label}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;
                });
            } else {
                historyHtml = '<div class="text-center text-gray-500 text-sm py-8">No navigation history available</div>';
            }

            content.innerHTML = `
                <div class="bg-gradient-to-r from-taurusGold/10 to-transparent border border-taurusGold/20 rounded-xl p-6">
                    <div class="flex items-center gap-4 mb-4">
                        ${flagHtml}
                        <div>
                            <h4 class="text-white font-bold text-lg">${loc}, ${country}</h4>
                            <p class="text-xs text-gray-500 font-mono">Session: ${data.session_id || 'Unknown'}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 mt-4">
                        <div class="bg-black/40 rounded-lg p-3 border border-white/5">
                            <p class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">IP Address</p>
                            <p class="text-sm text-taurusGold font-mono">${data.ip_masked || '---'}</p>
                        </div>
                        <div class="bg-black/40 rounded-lg p-3 border border-white/5">
                            <p class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">ISP / Network</p>
                            <p class="text-sm text-white">${data.location?.isp || 'Unknown'}</p>
                        </div>
                        ${data.traffic_source && data.traffic_source !== 'Direct / Unknown' ? `
                        <div class="bg-black/40 rounded-lg p-3 border border-white/5 col-span-2">
                            <p class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Traffic Source</p>
                            <p class="text-sm text-taurusGold font-bold flex items-center gap-2">
                                <i data-lucide="${data.traffic_source.includes('Instagram') ? 'instagram' : data.traffic_source.includes('Facebook') ? 'facebook' : data.traffic_source.includes('TikTok') ? 'music-2' : data.traffic_source.includes('Twitter') || data.traffic_source.includes('X/') ? 'twitter' : data.traffic_source.includes('LinkedIn') ? 'linkedin' : data.traffic_source.includes('Google') ? 'search' : 'link'}" class="w-3.5 h-3.5"></i>
                                ${data.traffic_source}
                                ${data.traffic_method ? `<span class="text-[9px] text-gray-500 font-normal">(${data.traffic_method})</span>` : ''}
                            </p>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Device Info -->
                <div class="border border-white/5 rounded-xl p-6">
                    <h5 class="text-white font-bold uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
                        <i data-lucide="smartphone" class="w-4 h-4 text-taurusGold"></i>
                        Device Information
                    </h5>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <p class="text-[10px] text-gray-500 uppercase mb-1 flex items-center gap-1.5">
                                Model
                                ${data.device?.modelConfidence ? `
                                <span class="w-2 h-2 rounded-full ${data.device.modelConfidence === 'high' ? 'bg-green-500' : data.device.modelConfidence === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}" title="Detection confidence: ${data.device.modelConfidence}"></span>
                                ` : ''}
                            </p>
                            <p class="text-sm text-white">${data.device?.model || 'Unknown'}</p>
                            ${data.device?.modelConfidence && data.device.modelConfidence !== 'high' ? `
                            <p class="text-[9px] text-gray-600 mt-0.5 italic">~${data.device.modelConfidence} certainty</p>
                            ` : ''}
                        </div>
                        <div>
                            <p class="text-[10px] text-gray-500 uppercase mb-1">Type</p>
                            <p class="text-sm text-white">${data.device?.type || 'Unknown'}</p>
                        </div>
                        <div>
                            <p class="text-[10px] text-gray-500 uppercase mb-1">Browser</p>
                            <p class="text-sm ${data.device?.inAppSource ? 'text-taurusGold font-bold' : 'text-white'} flex items-center gap-1">
                                ${data.device?.inAppSource ? `<i data-lucide="${data.device.inAppSource === 'Instagram' ? 'instagram' : data.device.inAppSource === 'Facebook' ? 'facebook' : data.device.inAppSource === 'TikTok' ? 'music-2' : 'app-window'}" class="w-3 h-3"></i>` : ''}
                                ${data.device?.browser || 'Unknown'}
                            </p>
                        </div>
                        <div>
                            <p class="text-[10px] text-gray-500 uppercase mb-1">OS</p>
                            <p class="text-sm text-white">${data.device?.os || 'Unknown'}</p>
                        </div>
                        <div>
                            <p class="text-[10px] text-gray-500 uppercase mb-1">Screen</p>
                            <p class="text-sm text-gray-400 font-mono">${data.device?.screen || 'Unknown'}</p>
                        </div>
                        <div>
                            <p class="text-[10px] text-gray-500 uppercase mb-1">Language</p>
                            <p class="text-sm text-gray-400">${data.device?.language || 'Unknown'}</p>
                        </div>
                        ${data.device?.gpu && data.device.gpu !== 'Unknown GPU' ? `
                        <div class="col-span-2">
                            <p class="text-[10px] text-gray-500 uppercase mb-1">GPU Renderer</p>
                            <p class="text-xs text-gray-400 font-mono truncate" title="${data.device.gpu}">${data.device.gpu}</p>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Navigation History -->
                <div class="border border-white/5 rounded-xl p-6">
                    <h5 class="text-white font-bold uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
                        <i data-lucide="activity" class="w-4 h-4 text-taurusGold"></i>
                        Navigation Timeline
                    </h5>
                    <div class="space-y-3">
                        ${historyHtml}
                    </div>
                </div>
            `;

            modal.classList.remove('hidden');
            lucide.createIcons();
        }

        function closeSessionModal() {
            const modal = document.getElementById('session-modal');
            if (modal) modal.classList.add('hidden');
        }


        async function loadTrafficChart() {
            if (!db) return;
            const container = document.getElementById('traffic-chart-bars');
            if (!container) return;

            try {
                const doc = await db.collection('stats').doc('daily').get();
                const data = doc.exists ? doc.data() : {};
                const counts = [];
                const labels = [];
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const key = d.toISOString().split('T')[0];
                    counts.push(data[key] || 0);
                    labels.push(dayNames[d.getDay()]);
                }

                const max = Math.max(...counts, 10);
                let html = '';
                counts.forEach((count, i) => {
                    const heightPct = (count / max) * 100;
                    const isToday = i === 6;

                    html += `
                        <div class="flex flex-col items-center gap-2 flex-1 group">
                            <div class="w-full h-32 flex items-end rounded-xl overflow-hidden bg-white/5 relative">
                                <div style="height: ${heightPct}%;"
                                     class="w-full ${isToday ? 'bg-taurusGold shadow-[0_0_20px_rgba(255,215,0,0.4)]' : 'bg-white/10 group-hover:bg-white/20'} transition-all duration-700 rounded-t-lg">
                                </div>
                                <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                    <span class="text-[10px] font-black text-white">${count}</span>
                                </div>
                            </div>
                            <span class="text-[9px] ${isToday ? 'text-taurusGold font-black' : 'text-gray-600'} uppercase tracking-widest">${labels[i]}</span>
                        </div>
                    `;
                });
                container.innerHTML = html;
            } catch (e) { console.error("Chart Logic Error", e); }
        }

        function setupRealtimeListeners() {
            if (!db) { console.error("DB Not Initialized"); return; }
            console.log("Setting up realtime listeners...");

            db.collection('messages').onSnapshot(snapshot => {
                let unreadCount = 0;
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (!isSystemMessage(data) && data.status === 'new') unreadCount++;
                });

                const bgBadge = document.querySelector('#nav-messages span');
                if (bgBadge) {
                    bgBadge.innerText = unreadCount;
                    bgBadge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
                }
                const statMsg = document.getElementById('stat-total-messages');
                if (statMsg) statMsg.innerText = unreadCount;

                // NEW MESSAGE NOTIFICATION (when not in Inbox)
                let newIncoming = [];
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const id = change.doc.id;
                        const data = change.doc.data();
                        if (isSystemMessage(data)) return;
                        if (!seenMessageIds.has(id)) {
                            seenMessageIds.add(id);
                            if (messagesListenerInitialized && data.status === 'new') {
                                newIncoming.push(data);
                            }
                        }
                    }
                });

                if (!messagesListenerInitialized) messagesListenerInitialized = true;

                if (newIncoming.length > 0 && activeTab !== 'messages') {
                    const latest = newIncoming[0];
                    const name = latest.name || 'New Lead';
                    systemAlert('NEW MESSAGE', `${name} sent a request (${newIncoming.length} new)`, 'mail');
                }

                loadViewStats();
            }, error => {
                console.error("❌ Stats Listener Error:", error);
            });
        }

        function startAutoPipelineListener() {
            if (!AUTO_PIPELINE_ENABLED || autoPipelineUnsubscribe || !db) return;
            autoPipelineUnsubscribe = db.collection('messages')
                .orderBy('timestamp', 'desc')
                .limit(50)
                .onSnapshot(snapshot => {
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        if (isSystemMessage(data)) return;
                        autoCreateDossierFromMessage(doc.id, data);
                    });
                }, error => {
                    console.error("Auto Pipeline Listener Error:", error);
                });
        }

        async function loadViewStats() {
            if (!db) return;
            try {
                const doc = await db.collection('stats').doc('global').get();
                console.log("Stats Doc Exists:", doc.exists);
                const views = doc.exists ? doc.data().views || 0 : 0;
                const el = document.getElementById('stat-total-views');
                if (el) el.innerText = views;
            } catch (e) {
                console.error("❌ loadViewStats Error:", e);
            }
        }

        async function toggleMessageStatus(id, currentStatus) {
            const newStatus = currentStatus === 'new' ? 'read' : 'new';
            await db.collection('messages').doc(id).update({ status: newStatus });
        }

        async function deleteMessage(id) {
            const confirmed = await systemConfirm("NEUTRALIZATION", "Confirm neutralization of this data record?", "trash-2");
            if (!confirmed) return;
            await db.collection('messages').doc(id).delete();
            selectedMessages.delete(id);
            updateMessagesBulkUI();
        }

        function toggleRole() {
            const el = document.getElementById('role-text');
            el.innerText = el.innerText === 'Supervisor' ? 'Admin' : 'Supervisor';
        }

        function openMessageModal(id) {
            currentOpenedMessageId = id;
            const data = messagesMap[id];
            if (!data) return;

            // Mark as READ immediately
            if (data.status === 'new') toggleMessageStatus(id, 'new');

            document.getElementById('modal-name').innerText = data.name || 'Unknown Entity';
            document.getElementById('modal-email').innerText = data.email || 'No address';
            document.getElementById('modal-date').innerText = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString() : 'N/A';
            document.getElementById('message-detail-content').innerText = data.message || 'Transmission empty.';
            document.getElementById('message-modal').classList.remove('hidden');
        }

        function closeMessageModal() {
            document.getElementById('message-modal').classList.add('hidden');
        }

        function convertMessageToProject(id) {
            closeMessageModal();
            const data = messagesMap[id];
            if (!data) return;
            switchTab('projects');
            // Pass data object to modal instead of filling after form.reset()
            openProjectModalWithData({
                client: data.name || '',
                email: data.email || '',
                requests: data.message || ''
            });
        }

        /**
         * Create quote from message - opens pricing tool with pre-filled client data
         * @param {string} messageId - Message document ID
         */
        async function createQuoteFromMessage(messageId) {
            editingProjectId = null; // Clean state
            const message = messagesMap[messageId];
            if (!message) {
                console.error('Message not found');
                return;
            }
            const projectId = await getOrCreateProjectFromMessage(messageId, message, false);
            if (projectId) {
                pricingContextProjectId = projectId;
            }
            pricingContextMessageId = messageId;

            // Close message modal
            closeMessageModal();

            // Switch to pricing tab
            switchTab('pricing');

            // Send pre-fill message to pricing tool iframe
            setTimeout(() => {
                const pricingIframe = document.querySelector('iframe[src*="pricing-tool"]');
                if (pricingIframe && pricingIframe.contentWindow) {
                    pricingIframe.contentWindow.postMessage({
                        type: 'PRE_FILL_CLIENT',
                        data: {
                            clientName: message.name || '',
                            clientEmail: message.email || '',
                            messageId: messageId,
                            projectId: projectId,
                            country: message.country || 'TR',
                            // Pass Technical Configuration
                            siteType: message.projectType || message.siteType || '', // Handle legacy/compat
                            designType: message.designType || '',
                            pageCount: message.pageCount || '', // Ensure string or number consistency as needed by tool
                            deliverySpeed: message.deliverySpeed || '',
                            maintenanceLevel: message.maintenanceLevel || '',
                            selectedAddons: message.selectedAddons || []
                        }
                    }, '*');
                    console.log('📋 Opened pricing tool with client data:', message.name);
                } else {
                    console.warn('Pricing tool iframe not found');
                }
            }, 500); // Wait for tab switch
        }

        /**
         * Helper: Create project document from message data
         */
        async function createProjectFromMessage(messageId) {
            try {
                const message = messagesMap[messageId] || null;
                const projectId = await getOrCreateProjectFromMessage(messageId, message, false);
                if (projectId) {
                    console.log("✅ Project ready with ID:", projectId);
                }
                return projectId;
            } catch (error) {
                console.error("Error creating project from message:", error);
                return null;
            }
        }

        /**
         * Create project directly from message (uses helper function)
         * @param {string} messageId - Message document ID
         */
        async function createProjectDirectly(messageId) {
            if (!confirm('Create project directly without a quote?')) return;

            console.log('🚀 Creating project from message...');

            // Use existing Phase 3 function
            const projectId = await createProjectFromMessage(messageId);

            if (projectId) {
                closeMessageModal();
                alert(`✅ Project created successfully!`);
                switchTab('projects');
            } else {
                alert('❌ Failed to create project. Check console for details.');
            }
        }

        /**
         * Calculate price for the current project in modal
         * Takes the client name and email from the open project form and opens pricing tool
         */
        async function calculatePriceForProject() {
            const formClientName = (document.getElementById('p-client').value || '').trim();
            const formClientEmail = (document.getElementById('p-email').value || '').trim();
            const formProjectName = (document.getElementById('p-name').value || '').trim();
            const formRequests = (document.getElementById('p-requests')?.value || '').trim();
            const data = currentProjectData || {};
            const clientName = formClientName || data.clientName || '';
            const clientEmail = formClientEmail || data.clientEmail || '';
            const existingProjectId = editingProjectId || data.id || pricingContextProjectId || null;
            const messageId = data.messageId || data.sourceMessageId || pricingContextMessageId || null;

            if (!clientName) {
                alert("Please enter a Client Identity first.");
                return;
            }

            let projectId = existingProjectId;
            if (!projectId) {
                try {
                    const draftName = formProjectName || data.projectName || `Project for ${clientName}`;
                    const draftData = {
                        clientName: clientName,
                        clientEmail: clientEmail,
                        projectName: draftName,
                        name: draftName,
                        status: 'active',
                        workflowStage: 'lead',
                        requests: formRequests || data.description || '',
                        description: formRequests || data.description || '',
                        country: data.country || (data.currency === 'EUR' ? 'MT' : 'TR'),
                        autoPipeline: false
                    };
                    projectId = await saveProjectToFirestore(draftData);
                    if (!projectId) {
                        alert("Failed to create project ID. Please try again.");
                        return;
                    }
                    pricingContextProjectId = projectId;
                    currentProjectData = { ...data, id: projectId, clientName, clientEmail, projectName: draftName };
                } catch (e) {
                    console.error('Failed to create project ID:', e);
                    alert("Failed to create project ID. Please try again.");
                    return;
                }
            }

            const payload = {
                projectId: projectId,
                messageId: messageId,
                clientName: clientName,
                clientEmail: clientEmail,
                country: data.country || (data.currency === 'EUR' ? 'MT' : 'TR'),
                siteType: data.siteType,
                designType: data.designType,
                pageCount: data.pageCount,
                deliverySpeed: data.deliverySpeed,
                maintenanceLevel: data.maintenanceLevel,
                selectedAddons: Array.isArray(data.selectedAddons) ? data.selectedAddons : []
            };

            if (projectId) {
                pricingContextProjectId = projectId;
            }

            // Close modal
            closeProjectModal();

            // Switch to pricing
            switchTab('pricing');

            // Robust Sync: Send data multiple times to ensure iframe is ready
            let attempts = 0;
            const syncInterval = setInterval(() => {
                attempts++;
                const pricingIframe = document.querySelector('iframe[src*="pricing-tool"]');

                if (pricingIframe && pricingIframe.contentWindow) {
                    pricingIframe.contentWindow.postMessage({
                        type: 'PRE_FILL_CLIENT',
                        data: payload
                    }, '*');
                    console.log(`📡 Sync Attempt ${attempts}: Data sent to pricing tool`);
                }

                if (attempts >= 3) clearInterval(syncInterval);
            }, 800); // Try at 0.8s, 1.6s, 2.4s
        }

        let editingProjectId = null;
