        // ============================================
        // MESSAGES / INBOX
        // ============================================

        async function loadMessages() {
            if (!db) return;
            const desktopBody = document.getElementById('messages-tbody-desktop');
            const mobileContainer = document.getElementById('messages-mobile-container');
            const recentLeadsContainer = document.getElementById('recent-leads-container');

            if (messagesUnsubscribe) messagesUnsubscribe();
            messagesUnsubscribe = db.collection('messages').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
                if (snapshot.empty) {
                    visibleMessageIds = [];
                    selectedMessages.clear();
                    updateMessagesBulkUI();
                    desktopBody.innerHTML = '<tr><td colspan="6" class="p-10 text-center text-gray-500 uppercase tracking-widest text-[10px]">Neural link empty. No messages.</td></tr>';
                    mobileContainer.innerHTML = '<div class="p-10 text-center text-gray-600 uppercase tracking-widest text-[10px]">No incoming signals found.</div>';
                    if (recentLeadsContainer) recentLeadsContainer.innerHTML = '<p class="text-[10px] text-gray-600 uppercase text-center py-4">No leads detected</p>';
                    return;
                }

                messagesMap = {};
                visibleMessageIds = [];
                let desktopHtml = '';
                let mobileHtml = '';
                let leadsHtml = '';
                let leadsCount = 0;

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const id = doc.id;
                    if (isSystemMessage(data)) return;

                    messagesMap[id] = data;

                    // AUTO-CREATE CLIENT from message if not already linked
                    if (data.email && !data.clientId) {
                        getOrCreateClient(data.email, data.name).then(client => {
                            if (client) {
                                // Link client to message
                                db.collection('messages').doc(id).update({
                                    clientId: client.id
                                });
                                // Update client stats
                                updateClientStats(client.id, 'message', id);
                            }
                        }).catch(err => console.error('Error linking client:', err));
                    }

                    // AUTO PIPELINE: Create dossier + auto quote
                    if (AUTO_PIPELINE_ENABLED) {
                        autoCreateDossierFromMessage(id, data);
                    }

                    const isNew = data.status === 'new';
                    const date = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleDateString() : 'N/A';

                    // Populate Recent Leads (limit 4)
                    if (leadsCount < 4) {
                        leadsHtml += `
                            <div onclick="openMessageModal('${id}')" class="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group">
                                <div class="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-taurusGold group-hover:scale-110 transition-transform">
                                    <i data-lucide="user" class="w-4 h-4"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="text-xs font-bold text-white truncate">${data.name || 'Anonymous'}</div>
                                    <div class="text-[9px] text-gray-500 font-mono truncate">${date}</div>
                                </div>
                                ${isNew ? '<div class="w-1.5 h-1.5 bg-taurusGold rounded-full shadow-[0_0_8px_rgba(255,215,0,0.6)]"></div>' : ''}
                            </div>
                        `;
                        leadsCount++;
                    }

                    // Global Search Filter
                    const searchSource = `${data.name || ''} ${data.email || ''} ${data.message || ''}`.toLowerCase();
                    if (searchQuery && !searchSource.includes(searchQuery)) return;

                    // Filtering for Messages View
                    if (currentMessageFilter === 'unread' && !isNew) return;
                    visibleMessageIds.push(id);
                    const isSelected = selectedMessages.has(id);

                    // Desktop Row
                    desktopHtml += `
                        <tr onclick="openMessageModal('${id}')" class="border-b border-white/5 hover:bg-white/5 transition-all group cursor-pointer">
                            <td class="p-4 w-select text-center" onclick="event.stopPropagation()">
                                <input type="checkbox" data-message-select="${id}" class="accent-[#FFD700]" ${isSelected ? 'checked' : ''} onchange="toggleMessageSelection('${id}', this.checked)">
                            </td>
                            <td class="p-4 w-status">
                                ${isNew ? '<span class="px-2 py-0.5 rounded-full border border-taurusGold/50 text-taurusGold text-[9px] font-black uppercase">Unread</span>' : '<span class="px-2 py-0.5 rounded-full bg-white/5 text-gray-500 text-[9px] font-black uppercase">Archived</span>'}
                            </td>
                            <td class="p-4 w-sender">
                                <div class="font-bold text-white force-truncate" title="${data.name || 'Anonymous'}">${highlightMatch(data.name || 'Anonymous', searchQuery)}</div>
                                <div class="text-[10px] text-gray-500 force-truncate" title="${data.email || ''}">${highlightMatch(data.email || '', searchQuery)}</div>
                                <!-- NEW: Status badges -->
                                <div class="flex gap-1 mt-1">
                                    ${data.quoteId ? '<span class="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">📋 QUOTED</span>' : ''}
                                    ${data.projectId ? '<span class="px-2 py-0.5 rounded text-[9px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">🚀 PROJECT</span>' : ''}
                                </div>
                            </td>
                            <td class="p-4 w-message text-gray-400 text-xs">
                                <div class="force-truncate" title="${data.message || ''}">${highlightMatch(data.message || 'No content...', searchQuery)}</div>
                            </td>
                            <td class="p-4 w-date text-gray-600 text-[10px] font-mono">${date}</td>
                            <td class="p-4 w-actions text-right" onclick="event.stopPropagation()">
                                <div class="flex items-center justify-end gap-1">
                                    <button onclick="toggleMessageStatus('${id}', '${data.status}')" title="${isNew ? 'Mark as Read' : 'Mark as Unread'}" style="display:inline-flex !important" class="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"><i data-lucide="${isNew ? 'mail-open' : 'mail'}" class="w-4 h-4"></i></button>
                                    <button onclick="deleteMessage('${id}')" title="Delete Signal" style="display:inline-flex !important" class="p-2 rounded-lg hover:bg-red-500/20 text-red-500 transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                                </div>
                            </td>
                        </tr>
                    `;

                    // Mobile Card
                    mobileHtml += `
                        <div onclick="openMessageModal('${id}')" class="message-card relative overflow-hidden active:scale-95 transition-all border ${isNew ? 'border-taurusGold bg-white/[0.02] ring-1 ring-taurusGold/20' : 'border-white/5 bg-white/[0.02]'}">
                            ${isNew ? '<div class="absolute top-0 right-0 p-2"><div class="w-2 h-2 bg-taurusGold rounded-full animate-pulse shadow-[0_0_8px_rgba(255,215,0,0.6)]"></div></div>' : ''}
                            <div class="flex items-center gap-4 mb-4">
                                <div onclick="event.stopPropagation()" class="shrink-0">
                                    <input type="checkbox" data-message-select="${id}" class="accent-[#FFD700]" ${isSelected ? 'checked' : ''} onchange="toggleMessageSelection('${id}', this.checked)">
                                </div>
                                <div class="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-taurusGold shadow-lg">
                                    <i data-lucide="user" class="w-6 h-6"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <h4 class="font-bold text-sm ${isNew ? 'text-white' : 'text-gray-300'} truncate">${highlightMatch(data.name || 'Anonymous', searchQuery)}</h4>
                                    <p class="text-[10px] text-taurusGold/70 font-mono truncate">${highlightMatch(data.email || '', searchQuery)}</p>
                                </div>
                                <span class="text-[9px] text-gray-500 font-mono self-start mt-1">${date}</span>
                            </div>
                            <p class="text-xs ${isNew ? 'text-gray-200 font-medium' : 'text-gray-500'} line-clamp-2 leading-relaxed italic mb-4">"${highlightMatch(data.message || 'No content...', searchQuery)}"</p>

                            <div class="pt-4 border-t border-white/5 flex items-center justify-between" onclick="event.stopPropagation()">
                                <div class="flex items-center gap-1">
                                    <button onclick="convertMessageToProject('${id}')" class="p-3 rounded-xl bg-taurusGold/10 text-taurusGold border border-taurusGold/20"><i data-lucide="briefcase" class="w-4 h-4"></i></button>
                                    <button onclick="toggleMessageStatus('${id}', '${data.status}')" class="p-3 rounded-xl bg-white/5 text-gray-400 border border-white/5"><i data-lucide="${isNew ? 'mail-open' : 'mail'}" class="w-4 h-4"></i></button>
                                </div>
                                <button onclick="deleteMessage('${id}')" class="p-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                            </div>
                        </div>
                    `;
                });

                if (!visibleMessageIds.length) {
                    desktopHtml = '<tr><td colspan="6" class="p-10 text-center text-gray-500 uppercase tracking-widest text-[10px]">No visitor messages found.</td></tr>';
                    mobileHtml = '<div class="p-10 text-center text-gray-600 uppercase tracking-widest text-[10px]">No incoming visitor messages found.</div>';
                }

                if (desktopBody) desktopBody.innerHTML = desktopHtml;
                if (mobileContainer) mobileContainer.innerHTML = mobileHtml;
                if (recentLeadsContainer) recentLeadsContainer.innerHTML = leadsHtml || '<p class="text-[10px] text-gray-600 uppercase text-center py-4">No leads detected</p>';
                pruneSelection(selectedMessages, visibleMessageIds);
                updateMessagesBulkUI();
                lucide.createIcons();
            });
        }

        function updateMessagesBulkUI() {
            const count = selectedMessages.size;
            const total = visibleMessageIds.length;
            const countEl = document.getElementById('messages-selected-count');
            const deleteBtn = document.getElementById('messages-bulk-delete');
            const selectAll = document.getElementById('messages-select-all');
            const selectAllTop = document.getElementById('messages-select-all-top');

            if (countEl) countEl.innerText = `${count} Selected`;
            if (deleteBtn) deleteBtn.disabled = count === 0;
            [selectAll, selectAllTop].forEach(el => {
                if (!el) return;
                el.checked = total > 0 && count === total;
                el.indeterminate = count > 0 && count < total;
            });
        }

        function toggleMessageSelection(id, checked) {
            if (checked) selectedMessages.add(id);
            else selectedMessages.delete(id);
            document.querySelectorAll(`input[data-message-select="${id}"]`).forEach(el => { el.checked = checked; });
            updateMessagesBulkUI();
        }

        function toggleSelectAllMessages(checked) {
            if (checked) visibleMessageIds.forEach(id => selectedMessages.add(id));
            else visibleMessageIds.forEach(id => selectedMessages.delete(id));
            document.querySelectorAll('input[data-message-select]').forEach(el => {
                el.checked = checked && visibleMessageIds.includes(el.dataset.messageSelect);
            });
            updateMessagesBulkUI();
        }

        async function bulkDeleteMessages() {
            if (!db || selectedMessages.size === 0) return;
            const count = selectedMessages.size;
            const confirmed = await systemConfirm('BULK DELETE', `Delete ${count} selected messages?`, 'trash-2');
            if (!confirmed) return;

            try {
                const batch = db.batch();
                Array.from(selectedMessages).forEach(id => batch.delete(db.collection('messages').doc(id)));
                await batch.commit();
                selectedMessages.clear();
                updateMessagesBulkUI();
            } catch (e) {
                systemAlert('ERROR', 'Bulk delete failed: ' + e.message, 'x-circle');
            }
        }
