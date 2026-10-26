        // ============================================
        // CLIENTS
        // ============================================

        function updateClientsBulkUI() {
            const count = selectedClients.size;
            const total = visibleClientIds.length;
            const countEl = document.getElementById('clients-selected-count');
            const deleteBtn = document.getElementById('clients-bulk-delete');
            const selectAll = document.getElementById('clients-select-all');
            const selectAllTop = document.getElementById('clients-select-all-top');

            if (countEl) countEl.innerText = `${count} Selected`;
            if (deleteBtn) deleteBtn.disabled = count === 0;
            [selectAll, selectAllTop].forEach(el => {
                if (!el) return;
                el.checked = total > 0 && count === total;
                el.indeterminate = count > 0 && count < total;
            });
        }

        function toggleClientSelection(id, checked) {
            if (checked) selectedClients.add(id);
            else selectedClients.delete(id);
            updateClientsBulkUI();
        }

        function toggleSelectAllClients(checked) {
            if (checked) {
                visibleClientIds.forEach(id => selectedClients.add(id));
            } else {
                visibleClientIds.forEach(id => selectedClients.delete(id));
            }
            document.querySelectorAll('.client-select-checkbox').forEach(cb => {
                cb.checked = checked;
            });
            updateClientsBulkUI();
        }

        async function deleteClient(clientId) {
            const confirmed = await systemConfirm('DELETE CLIENT', 'Delete this client permanently?', 'trash-2');
            if (!confirmed) return;
            try {
                await db.collection('clients').doc(clientId).delete();
                selectedClients.delete(clientId);
                updateClientsBulkUI();
            } catch (e) {
                systemAlert('ERROR', 'Delete failed: ' + e.message, 'x-circle');
            }
        }

        async function bulkDeleteClients() {
            if (selectedClients.size === 0) return;
            const confirmed = await systemConfirm('BULK DELETE', `Delete ${selectedClients.size} selected clients?`, 'trash-2');
            if (!confirmed) return;
            const ids = Array.from(selectedClients);
            try {
                const batch = db.batch();
                ids.forEach(id => batch.delete(db.collection('clients').doc(id)));
                await batch.commit();
                selectedClients.clear();
                updateClientsBulkUI();
            } catch (e) {
                systemAlert('ERROR', 'Bulk delete failed: ' + e.message, 'x-circle');
            }
        }

        /**
         * Load all clients from Firestore and populate the clients table
         * Real-time listener for instant updates
         */
        async function loadClients() {
            const clientsTable = document.getElementById('clients-table-body');
            if (!clientsTable) return;

            if (clientsUnsubscribe) clientsUnsubscribe();
            clientsUnsubscribe = db.collection('clients')
                .orderBy('lastContactDate', 'desc')
                .onSnapshot(snapshot => {
                    let clientsHtml = '';
                    let totalMessages = 0, totalQuotes = 0, totalProjects = 0;
                    visibleClientIds = [];

                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const lastContact = data.lastContactDate
                            ? new Date(data.lastContactDate.seconds * 1000).toLocaleDateString()
                            : 'Never';

                        // Aggregate stats
                        totalMessages += data.totalMessages || 0;
                        totalQuotes += data.totalQuotes || 0;
                        totalProjects += data.totalProjects || 0;
                        visibleClientIds.push(doc.id);
                        const checkedAttr = selectedClients.has(doc.id) ? 'checked' : '';

                        clientsHtml += `
                            <tr onclick="openClientModal('${doc.id}')" class="border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer group">
                                <td class="p-4 text-center" onclick="event.stopPropagation()">
                                    <input type="checkbox" class="client-select-checkbox accent-[#FFD700]" ${checkedAttr}
                                        onchange="toggleClientSelection('${doc.id}', this.checked)">
                                </td>
                                <td class="p-4">
                                    <div class="font-bold text-white group-hover:text-taurusGold transition-colors">${data.name || 'Unknown'}</div>
                                    <div class="text-xs text-gray-500">${data.email}</div>
                                </td>
                                <td class="p-4 text-center text-taurusGold font-bold">${data.totalMessages || 0}</td>
                                <td class="p-4 text-center text-blue-400 font-bold">${data.totalQuotes || 0}</td>
                                <td class="p-4 text-center text-green-400 font-bold">${data.totalProjects || 0}</td>
                                <td class="p-4 text-gray-400 text-xs">${lastContact}</td>
                                <td class="p-4" onclick="event.stopPropagation()">
                                    <div class="flex items-center justify-end gap-2">
                                        <button onclick="openClientModal('${doc.id}')" class="px-3 py-1 bg-taurusGold/10 text-taurusGold rounded hover:bg-taurusGold hover:text-black transition-all text-xs font-bold uppercase">
                                            VIEW DETAILS
                                        </button>
                                        <button onclick="deleteClient('${doc.id}')" title="Delete Client"
                                            class="p-2 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20">
                                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    });

                    clientsTable.innerHTML = clientsHtml || '<tr><td colspan="7" class="p-8 text-center text-gray-500">No clients yet</td></tr>';

                    // One-line summary instead of duplicated stat cards
                    const clientsSummary = document.getElementById('clients-summary');
                    if (clientsSummary) clientsSummary.textContent = `${snapshot.size} client · ${totalMessages} messages · ${totalQuotes} proposals · ${totalProjects} projects`;

                    pruneSelection(selectedClients, visibleClientIds);
                    updateClientsBulkUI();
                    lucide.createIcons();
                });
        }

        /**
         * Open client detail modal and display full history
         * @param {string} clientId - Firestore client document ID
         */
        async function openClientModal(clientId) {
            try {
                // Fetch client data
                const clientDoc = await db.collection('clients').doc(clientId).get();
                if (!clientDoc.exists) {
                    console.error('Client not found:', clientId);
                    return;
                }

                const data = clientDoc.data();

                // Update header
                document.getElementById('client-modal-name').textContent = data.name || 'Unknown';
                document.getElementById('client-modal-email').textContent = data.email;

                // Update stats
                document.getElementById('client-total-messages').textContent = data.totalMessages || 0;
                document.getElementById('client-total-quotes').textContent = data.totalQuotes || 0;
                document.getElementById('client-total-projects').textContent = data.totalProjects || 0;

                // Load and render timeline
                const history = await getClientHistory(clientId);
                const timelineHtml = renderClientTimeline(history);
                document.getElementById('client-timeline').innerHTML = timelineHtml;

                // Show modal
                document.getElementById('client-modal').classList.remove('hidden');
                lucide.createIcons();
            } catch (error) {
                console.error('Error opening client modal:', error);
            }
        }

        /**
         * Close client detail modal
         */
        function closeClientModal() {
            document.getElementById('client-modal').classList.add('hidden');
        }

        /**
         * Render client timeline from history data
         * @param {Object} history - Object with messages, quotes, projects arrays
         * @returns {string} HTML string for timeline
         */
        function renderClientTimeline(history) {
            const allItems = [
                ...history.messages.map(m => ({ type: 'message', data: m, date: m.timestamp })),
                ...history.quotes.map(q => ({ type: 'quote', data: q, date: q.createdAt })),
                ...history.projects.map(p => ({ type: 'project', data: p, date: p.createdAt }))
            ];

            // Sort by date descending (newest first)
            allItems.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));

            if (allItems.length === 0) {
                return '<p class="text-gray-500 text-center py-8">No activity yet</p>';
            }

            return allItems.map(item => {
                const date = item.date?.seconds
                    ? new Date(item.date.seconds * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'Unknown';

                switch (item.type) {
                    case 'message':
                        return `
                            <div class="flex gap-3 p-3 bg-taurusGold/5 rounded-lg border border-taurusGold/20 hover:bg-taurusGold/10 transition-all">
                                <i data-lucide="mail" class="w-4 h-4 text-taurusGold mt-1 flex-shrink-0"></i>
                                <div class="flex-1 min-w-0">
                                    <div class="text-white text-sm font-bold">Message Received</div>
                                    <div class="text-gray-400 text-xs truncate">${(item.data.message || '').substring(0, 100)}...</div>
                                    <div class="text-gray-600 text-xs mt-1">${date}</div>
                                </div>
                            </div>
                        `;
                    case 'quote':
                        return `
                            <div class="flex gap-3 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20 hover:bg-blue-500/10 transition-all">
                                <i data-lucide="file-text" class="w-4 h-4 text-blue-400 mt-1 flex-shrink-0"></i>
                                <div class="flex-1 min-w-0">
                                    <div class="text-white text-sm font-bold">Proposal ${item.data.quoteNumber}</div>
                                    <div class="text-gray-400 text-xs">${item.data.siteType || 'N/A'} - ${formatAdminMoney(item.data.totalPrice || 0, item.data.currency || 'TRY')}</div>
                                    <div class="text-gray-600 text-xs mt-1">${date}</div>
                                </div>
                            </div>
                        `;
                    case 'project':
                        return `
                            <div class="flex gap-3 p-3 bg-green-500/5 rounded-lg border border-green-500/20 hover:bg-green-500/10 transition-all">
                                <i data-lucide="rocket" class="w-4 h-4 text-green-400 mt-1 flex-shrink-0"></i>
                                <div class="flex-1 min-w-0">
                                    <div class="text-white text-sm font-bold">Project ${item.data.projectNumber}</div>
                                    <div class="text-gray-400 text-xs truncate">${item.data.name || 'Untitled Project'}</div>
                                    <div class="text-gray-600 text-xs mt-1">${date}</div>
                                </div>
                            </div>
                        `;
                    default:
                        return '';
                }
            }).join('');
        }
