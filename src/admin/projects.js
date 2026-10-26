        // ============================================
        // PROJECTS
        // ============================================

        async function loadProjects() {
            if (!db) return;
            const container = document.getElementById('projects-grid');

            if (projectsUnsubscribe) projectsUnsubscribe();
            projectsUnsubscribe = db.collection('projects').onSnapshot(snapshot => {
                if (snapshot.empty) {
                    container.innerHTML = '<div class="col-span-full py-20 text-center text-gray-500 uppercase tracking-widest text-xs">No active deployments.</div>';
                    return;
                }

                let html = '';
                snapshot.forEach(doc => {
                    const data = doc.data();

                    // Global Search Filter
                    const projectTitle = data.projectName || data.name || 'Untitled';
                    const searchSource = `${projectTitle} ${data.clientName || ''} ${data.clientEmail || ''}`.toLowerCase();
                    if (searchQuery && !searchSource.includes(searchQuery)) return;

                    const status = data.status || 'active';
                    const stage = data.workflowStage || 'lead';
                    if (currentProjectFilter !== 'all' && status !== currentProjectFilter) return;

                    const progress = Math.min(100, Math.max(0, Number(data.progress) || 0));
                    const budget = Number(data.budget) || 0;
                    const dueDate = data.dueDate || data.deliveryDate || null;
                    html += `
                        <div onclick="openProjectModal('${doc.id}')" class="group bg-white/5 border border-glassBorder rounded-2xl p-5 hover:border-taurusGold/40 transition-all cursor-pointer active:scale-[0.98]">
                            <div class="flex items-start justify-between gap-3">
                                <h3 class="min-w-0 flex-1 text-base font-display font-bold text-white group-hover:text-taurusGold transition-colors leading-snug break-words">${highlightMatch(projectTitle, searchQuery)}</h3>
                                <span class="flex-none px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${status === 'active' ? 'bg-taurusGold text-black' : 'bg-green-500/20 text-green-400 border border-green-500/30'}">${status}</span>
                            </div>
                            <div class="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1 mb-5 truncate">${highlightMatch(data.clientName || 'Private Client', searchQuery)}</div>

                            <div class="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                                <span>${stage}</span>
                                <span class="text-taurusGold">${progress}%</span>
                            </div>
                            <div class="h-1.5 rounded-full bg-white/10 overflow-hidden mb-4">
                                <div class="h-full rounded-full bg-taurusGold transition-all" style="width:${progress}%"></div>
                            </div>

                            <div class="flex items-center justify-between text-[10px] text-gray-500 font-mono">
                                <span>${budget ? formatAdminMoney(budget, data.currency || 'TRY') : '—'}</span>
                                <span>${dueDate ? dueDate : ''}</span>
                            </div>
                        </div>
                    `;
                });

                container.innerHTML = html || '<div class="col-span-full py-20 text-center text-gray-500 uppercase tracking-widest text-xs">No projects in this category.</div>';
                lucide.createIcons();
            });
        }

        let intelUnsubscribe = null;

        function updateVisitorsBulkUI() {
            const count = selectedVisitors.size;
            const total = visibleVisitorIds.length;
            const countEl = document.getElementById('visitors-selected-count');
            const deleteBtn = document.getElementById('visitors-bulk-delete');
            const selectAll = document.getElementById('visitors-select-all');

            if (countEl) countEl.innerText = `${count} Selected`;
            if (deleteBtn) deleteBtn.disabled = count === 0;
            if (selectAll) {
                selectAll.checked = total > 0 && count === total;
                selectAll.indeterminate = count > 0 && count < total;
            }
        }

        function toggleVisitorSelection(id, checked) {
            if (checked) selectedVisitors.add(id);
            else selectedVisitors.delete(id);
            updateVisitorsBulkUI();
        }

        function toggleSelectAllVisitors(checked) {
            if (checked) {
                visibleVisitorIds.forEach(id => selectedVisitors.add(id));
            } else {
                visibleVisitorIds.forEach(id => selectedVisitors.delete(id));
            }
            document.querySelectorAll('.visitor-select-checkbox').forEach(cb => {
                cb.checked = checked;
            });
            updateVisitorsBulkUI();
        }

        async function bulkDeleteVisitors() {
            if (selectedVisitors.size === 0) return;
            const confirmed = await systemConfirm('BULK DELETE', `Delete ${selectedVisitors.size} selected sessions?`, 'trash-2');
            if (!confirmed) return;
            const ids = Array.from(selectedVisitors);
            try {
                const batch = db.batch();
                ids.forEach(id => batch.delete(db.collection('visitors_v1').doc(id)));
                await batch.commit();
                selectedVisitors.clear();
                updateVisitorsBulkUI();
            } catch (e) {
                systemAlert('ERROR', 'Bulk delete failed: ' + e.message, 'x-circle');
            }
        }

        async function loadIntelligence() {
            if (!db) return;
            const container = document.getElementById('visitor-table-body');
            const totalEl = document.getElementById('intel-total-visitors');
            const onlineEl = document.getElementById('intel-online-count');
            const topLocEl = document.getElementById('intel-top-loc');
            const mobileEl = document.getElementById('intel-mobile-pct');
            ensureTaurusGlobe();

            // Prevent multiple listeners
            if (intelUnsubscribe) {
                console.log("🐂 Sync active, maintaining signal connection.");
                ensureTaurusGlobe();
                return;
            }

            // Set loading state
            if (container) container.innerHTML = '<tr><td colspan="8" class="py-12 text-center text-gray-500 animate-pulse font-mono text-xs">ESTABLISHING REAL-TIME SIGNAL...</td></tr>';

            // Real-time listener
            intelUnsubscribe = db.collection('visitors_v1').orderBy('last_seen', 'desc').limit(50)
                .onSnapshot((snapshot) => {
                    console.log("🎯 Intelligence Synced:", snapshot.size, "signals");

                    if (snapshot.empty) {
                        if (container) container.innerHTML = '<tr><td colspan="8" class="py-12 text-center text-gray-600 font-mono text-xs">NO SIGNALS DETECTED YET.</td></tr>';
                        if (totalEl) totalEl.innerText = "0";
                        if (onlineEl) onlineEl.innerText = "0";
                        if (topLocEl) topLocEl.innerText = "N/A";
                        if (mobileEl) mobileEl.innerText = "0%";
                        if (window.TaurusGlobe) window.TaurusGlobe.updateVisitors([]);
                        return;
                    }

                    let html = '';
                    let onlineCount = 0;
                    let mobileCount = 0;
                    let locationMap = {};
                    let globeVisitors = [];
                    visibleVisitorIds = [];

                    snapshot.forEach(doc => {
                        const d = doc.data();
                        const now = Date.now();
                        const lastSeenTime = d.last_seen ? (d.last_seen.toMillis ? d.last_seen.toMillis() : (new Date(d.last_seen).getTime() || Date.now())) : Date.now();

                        // Online Threshold: 3 minutes
                        const isOnline = (now - lastSeenTime) < (180 * 1000);

                        if (isOnline) onlineCount++;
                        if (d.device && d.device.type === 'Mobile') mobileCount++;

                        const loc = (d.location && d.location.city) ? d.location.city : (d.city || 'Unknown');
                        const country = (d.location && d.location.country) ? d.location.country : (d.country || '');
                        if (loc !== 'Unknown') locationMap[loc] = (locationMap[loc] || 0) + 1;

                        const countryCode = d.location && d.location.country_code ? d.location.country_code.toLowerCase() : '';
                        const flagHtml = countryCode ? `<img src="https://flagcdn.com/24x18/${countryCode}.png" class="w-5 rounded shadow-sm opacity-80" alt="${countryCode}" onerror="this.outerHTML='<span class=\'text-[8px] font-bold text-gray-500\'>${countryCode.toUpperCase()}</span>'"/>` : '';

                        const visitorId = doc.id;
                        intelDataMap[visitorId] = d;
                        visibleVisitorIds.push(visitorId);
                        globeVisitors.push({
                            id: visitorId,
                            ...d,
                            isOnline,
                            lastSeenTime
                        });
                        const checkedAttr = selectedVisitors.has(visitorId) ? 'checked' : '';

                        html += `
                            <tr class="border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer" onclick="openSessionModal('${visitorId}')">
                                <td class="p-4 align-middle text-center" onclick="event.stopPropagation()">
                                    <input type="checkbox" class="visitor-select-checkbox accent-[#FFD700]" ${checkedAttr}
                                        onchange="toggleVisitorSelection('${visitorId}', this.checked)">
                                </td>
                                <td class="p-4 align-middle">
                                    ${isOnline
                                ? '<div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]"></div><span class="text-green-500 text-[10px] font-bold uppercase tracking-wider">ONLINE</span></div>'
                                : '<div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-gray-600"></div><span class="text-gray-500 text-[10px] font-bold uppercase tracking-wider">OFFLINE</span></div>'}
                                </td>
                                <td class="p-4 align-middle">
                                    <div class="flex items-center gap-3">
                                        ${flagHtml}
                                        <div class="flex flex-col">
                                            <span class="text-white text-xs font-bold">${loc}</span>
                                            <span class="text-[10px] text-gray-500 uppercase">${country}</span>
                                        </div>
                                    </div>
                                </td>
                                <td class="p-4 align-middle text-xs text-taurusGold/80 font-mono tracking-tight">${d.location?.isp || d.org || 'Unknown Net'}</td>
                                <td class="p-4 align-middle text-xs text-gray-500 font-mono tracking-tight">${d.ip_masked || d.ip || '---'}</td>
                                <td class="p-4 align-middle text-xs text-gray-300">
                                    <div class="flex flex-col gap-1">
                                        <div class="flex items-center gap-2">
                                            <i data-lucide="${d.device?.type === 'Mobile' ? 'smartphone' : (d.device?.type === 'Tablet' ? 'tablet' : 'monitor')}" class="w-3 h-3 opacity-60"></i>
                                            <span class="font-bold">${d.device?.model || d.device?.type || 'Unknown'}</span>
                                        </div>
                                        <div class="text-[10px] text-gray-500 flex items-center gap-3 uppercase">
                                            <span>🌐 ${d.browser || 'Unknown'}</span>
                                            <span>💿 ${d.device?.os || d.device?.platform || 'Unknown OS'}</span>
                                        </div>
                                    </div>
                                </td>
                                <td class="p-4 align-middle text-xs text-gray-400 font-mono text-center">${d.history ? d.history.length : 1}</td>
                                <td class="p-4 align-middle text-right">
                                    <div class="flex flex-col items-end gap-1">
                                        <span class="text-[10px] text-gray-600 font-mono tracking-tighter">${new Date(lastSeenTime).toLocaleString('tr-TR')}</span>
                                        <div class="flex items-center gap-1 mt-1" onclick="event.stopPropagation()">
                                            <button onclick="sendRemoteCommand('${visitorId}', 'alarm')" title="Trigger Alarm" class="p-2 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"><i data-lucide="bell" class="w-4 h-4"></i></button>
                                            <button onclick="sendFreeze('${visitorId}')" title="Freeze + Message" class="p-2 rounded-md bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all"><i data-lucide="snowflake" class="w-4 h-4"></i></button>
                                            <button onclick="sendRemoteCommand('${visitorId}', 'block')" title="Block Visitor" class="p-2 rounded-md bg-white/10 text-gray-400 hover:bg-white hover:text-black transition-all"><i data-lucide="shield-alert" class="w-4 h-4"></i></button>
                                            <button onclick="sendRemoteCommand('${visitorId}', 'clear')" title="Unblock" class="p-2 rounded-md bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all"><i data-lucide="check-circle" class="w-4 h-4"></i></button>
                                            <button onclick="deleteSession('${visitorId}')" title="Delete Session" class="p-2 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        `;
                    });

                    if (container) container.innerHTML = html;
                    lucide.createIcons();
                    if (window.TaurusGlobe) window.TaurusGlobe.updateVisitors(globeVisitors);

                    // Update Global Stats
                    if (totalEl) totalEl.innerText = snapshot.size + (snapshot.size === 50 ? '+' : '');
                    if (onlineEl) onlineEl.innerText = onlineCount;
                    if (mobileEl) mobileEl.innerText = snapshot.size > 0 ? Math.round((mobileCount / snapshot.size) * 100) + '%' : '0%';

                    // Top Location logic
                    let topLoc = 'N/A';
                    let maxLoc = 0;
                    for (const [location, count] of Object.entries(locationMap)) {
                        if (count > maxLoc) {
                            maxLoc = count;
                            topLoc = location;
                        }
                    }
                    if (topLocEl) topLocEl.innerText = topLoc;

                    pruneSelection(selectedVisitors, visibleVisitorIds);
                    updateVisitorsBulkUI();
                }, (error) => {
                    console.error("🎯 Logic Sync Error:", error);
                    if (container) container.innerHTML = `<tr><td colspan="8" class="py-12 text-center text-red-500 font-mono text-xs">ENCRYPTION ERROR: ${error.message}</td></tr>`;
                });
        }
