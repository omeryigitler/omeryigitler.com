        // ============================================
        // QUOTES MANAGEMENT (Phase 4)
        // ============================================

        let currentQuoteFilter = 'all';

        function pruneSelection(set, validIds) {
            const validSet = new Set(validIds);
            Array.from(set).forEach(id => {
                if (!validSet.has(id)) set.delete(id);
            });
        }

        function updateQuotesBulkUI() {
            const count = selectedQuotes.size;
            const total = visibleQuoteIds.length;
            const countEl = document.getElementById('quotes-selected-count');
            const deleteBtn = document.getElementById('quotes-bulk-delete');
            const selectAll = document.getElementById('quotes-select-all');

            if (countEl) countEl.innerText = `${count} Selected`;
            if (deleteBtn) deleteBtn.disabled = count === 0;
            if (selectAll) {
                selectAll.checked = total > 0 && count === total;
                selectAll.indeterminate = count > 0 && count < total;
            }
        }

        function toggleQuoteSelection(id, checked) {
            if (checked) selectedQuotes.add(id);
            else selectedQuotes.delete(id);
            updateQuotesBulkUI();
        }

        function toggleSelectAllQuotes(checked) {
            if (checked) {
                visibleQuoteIds.forEach(id => selectedQuotes.add(id));
            } else {
                visibleQuoteIds.forEach(id => selectedQuotes.delete(id));
            }
            document.querySelectorAll('.quote-select-checkbox').forEach(cb => {
                cb.checked = checked;
            });
            updateQuotesBulkUI();
        }

        async function setQuoteStatus(id, status) {
            try {
                const update = { status, lastUpdated: firebase.firestore.FieldValue.serverTimestamp() };
                if (status === 'sent') update.sentAt = firebase.firestore.FieldValue.serverTimestamp();
                if (status === 'accepted') update.acceptedAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('quotes').doc(id).update(update);
            } catch (e) {
                systemAlert('ERROR', 'Status update failed: ' + e.message, 'x-circle');
            }
        }

        async function downloadQuotePdf(id) {
            try {
                const snap = await db.collection('quotes').doc(id).get();
                const q = snap.data();
                if (!q?.breakdown?.finalTotal) {
                    systemAlert('ERROR', 'This quote has no financial breakdown. Recreate it via the Pricing tool.', 'x-circle');
                    return;
                }
                systemAlert('DOC GENERATION', 'Generating proposal PDF...', 'loader-2');
                await generatePdfOnServer({
                    docType: 'quote',
                    projectId: q.projectId || null,
                    request: {
                        customerName: q.clientName,
                        customerEmail: q.clientEmail,
                        country: q.country || 'TR',
                        siteType: q.siteType,
                        pageCount: q.pageCount,
                        designType: q.designType,
                        deliverySpeed: q.deliverySpeed,
                        maintenanceLevel: q.maintenanceLevel || 'NONE',
                        selectedAddons: q.selectedAddons || [],
                        breakdown: q.breakdown
                    },
                    breakdown: q.breakdown,
                    download: true,
                    fileName: `${q.quoteNumber || 'Quote'}.pdf`
                });
            } catch (e) {
                systemAlert('ERROR', 'PDF generation failed: ' + e.message, 'x-circle');
            }
        }

        async function deleteQuote(id) {
            const confirmed = await systemConfirm('DELETE QUOTE', 'Delete this quote permanently?', 'trash-2');
            if (!confirmed) return;
            try {
                await db.collection('quotes').doc(id).delete();
                selectedQuotes.delete(id);
                updateQuotesBulkUI();
            } catch (e) {
                systemAlert('ERROR', 'Delete failed: ' + e.message, 'x-circle');
            }
        }

        async function bulkDeleteQuotes() {
            if (selectedQuotes.size === 0) return;
            const confirmed = await systemConfirm('BULK DELETE', `Delete ${selectedQuotes.size} selected proposals?`, 'trash-2');
            if (!confirmed) return;
            const ids = Array.from(selectedQuotes);
            try {
                const batch = db.batch();
                ids.forEach(id => batch.delete(db.collection('quotes').doc(id)));
                await batch.commit();
                selectedQuotes.clear();
                updateQuotesBulkUI();
            } catch (e) {
                systemAlert('ERROR', 'Bulk delete failed: ' + e.message, 'x-circle');
            }
        }

        /**
         * Load quotes from Firestore with real-time listener
         */
        async function loadQuotes() {
            if (!db) return;
            const container = document.getElementById('quotes-grid');
            if (!container) return;

            if (quotesUnsubscribe) quotesUnsubscribe();
            quotesUnsubscribe = db.collection('quotes')
                .orderBy('createdAt', 'desc')
                .onSnapshot(snapshot => {
                    container.innerHTML = '';
                    visibleQuoteIds = [];

                    if (snapshot.empty) {
                        container.innerHTML = '<div class="col-span-full py-20 text-center text-gray-500 uppercase tracking-widest text-xs">No quotes yet.</div>';
                        selectedQuotes.clear();
                        updateQuotesBulkUI();
                        return;
                    }

                    snapshot.forEach(doc => {
                        const quote = { id: doc.id, ...doc.data() };

                        // Filter by status
                        if (currentQuoteFilter !== 'all' && quote.status !== currentQuoteFilter) return;
                        visibleQuoteIds.push(quote.id);

                        // Get status badge class
                        let statusClass = '';
                        switch (quote.status) {
                            case 'draft': statusClass = 'bg-zinc-700 text-zinc-300'; break;
                            case 'sent': statusClass = 'bg-blue-500/20 text-blue-400 border border-blue-500/30'; break;
                            case 'accepted': statusClass = 'bg-green-500/20 text-green-400 border border-green-500/30'; break;
                            case 'rejected': statusClass = 'bg-red-500/20 text-red-400 border border-red-500/30'; break;
                            default: statusClass = 'bg-white/10 text-white';
                        }

                        const checkedAttr = selectedQuotes.has(quote.id) ? 'checked' : '';
                        const card = `
                            <div class="bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-[#FFD700]/30 transition-all cursor-pointer group">
                                <!-- Quote Number & Status -->
                                <div class="flex justify-between items-start mb-4">
                                    <div class="flex items-center gap-2">
                                        <input type="checkbox" class="quote-select-checkbox accent-[#FFD700]" ${checkedAttr}
                                            onclick="event.stopPropagation()" onchange="toggleQuoteSelection('${quote.id}', this.checked)">
                                        <h3 class="text-xl font-bold text-white group-hover:text-[#FFD700] transition-colors">${quote.quoteNumber || 'N/A'}</h3>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="px-3 py-1 rounded-full text-xs font-bold uppercase ${statusClass}">
                                            ${quote.status || 'draft'}
                                        </span>
                                        <button onclick="deleteQuote('${quote.id}'); event.stopPropagation()" title="Delete Quote"
                                            class="p-2 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20">
                                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                                        </button>
                                    </div>
                                </div>

                                <!-- Client Info -->
                                <div class="mb-4">
                                    <p class="text-gray-300 text-sm font-medium">${quote.clientName || 'Unknown'}</p>
                                    <p class="text-gray-500 text-xs font-mono">${quote.clientEmail || 'No email'}</p>
                                    ${quote.siteType ? `<p class="text-gray-400 text-xs mt-1">${quote.siteType}</p>` : ''}
                                </div>

                                <!-- Pricing -->
                                <div class="flex justify-between items-center pt-4 border-t border-white/5">
                                    <span class="text-gray-400 text-[10px] uppercase tracking-wider font-bold">Total</span>
                                    <span class="text-[#FFD700] font-bold text-lg">${formatAdminMoney(quote.totalPrice || 0, quote.currency || 'TRY')}</span>
                                </div>

                                <!-- Linked Project Badge -->
                                ${quote.projectId ? '<div class="mt-3 flex items-center gap-2"><i data-lucide="rocket" class="w-3 h-3 text-green-400"></i><span class="text-xs text-green-400 font-bold">PROJECT CREATED</span></div>' : ''}

                                <!-- Actions -->
                                <div class="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2">
                                    <button onclick="downloadQuotePdf('${quote.id}'); event.stopPropagation()"
                                        class="px-3 py-2 rounded-lg bg-taurusGold/10 text-taurusGold border border-taurusGold/25 hover:bg-taurusGold hover:text-black text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5">
                                        <i data-lucide="file-down" class="w-3.5 h-3.5"></i> PDF
                                    </button>
                                    ${quote.status === 'draft' ? `<button onclick="setQuoteStatus('${quote.id}','sent'); event.stopPropagation()"
                                        class="px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/25 hover:bg-blue-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">Mark Sent</button>` : ''}
                                    ${quote.status === 'sent' ? `<button onclick="setQuoteStatus('${quote.id}','accepted'); event.stopPropagation()"
                                        class="px-3 py-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/25 hover:bg-green-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">Mark Accepted</button>` : ''}
                                    ${quote.status === 'accepted' && !quote.projectId ? `<button onclick="createProjectFromQuote('${quote.id}'); event.stopPropagation()"
                                        class="px-3 py-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/25 hover:bg-green-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">Create Project</button>` : ''}
                                </div>
                            </div>
                        `;

                        container.insertAdjacentHTML('beforeend', card);
                    });

                    pruneSelection(selectedQuotes, visibleQuoteIds);
                    updateQuotesBulkUI();
                    lucide.createIcons();
                });
        }

        /**
         * Filter quotes by status
         * @param {string} status - 'all', 'draft', 'sent', 'accepted', 'rejected'
         */
        function filterQuotes(status) {
            currentQuoteFilter = status;

            // Update button styles
            ['all', 'draft', 'sent', 'accepted'].forEach(s => {
                const btn = document.getElementById(`filter-quotes-${s}`);
                if (btn) {
                    if (s === status) {
                        btn.classList.remove('bg-white/5');
                        btn.classList.add('bg-white/10', 'bg-white/20');
                    } else {
                        btn.classList.remove('bg-white/10', 'bg-white/20');
                        btn.classList.add('bg-white/5');
                    }
                }
            });

            // Reload quotes with new filter
            loadQuotes();
        }
