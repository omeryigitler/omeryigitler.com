        // --- WORKFLOW HELPERS ---
        function normalizeStage(stage) {
            return WORKFLOW_STAGES.includes(stage) ? stage : 'lead';
        }

        async function updateWorkflow(projectId, stage, meta = {}) {
            if (!db || !projectId) return;
            const normalized = normalizeStage(stage);
            const entry = {
                stage: normalized,
                source: meta.source || 'system',
                at: new Date().toISOString(),
                ...meta
            };
            try {
                await db.collection('projects').doc(projectId).update({
                    workflowStage: normalized,
                    workflowHistory: firebase.firestore.FieldValue.arrayUnion(entry),
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (e) {
                console.warn('Workflow update failed:', e.message);
            }
        }

        function setWorkflowUI(stage, approved) {
            const stageEl = document.getElementById('workflow-stage');
            const approveBtn = document.getElementById('workflow-approve-btn');
            if (stageEl) stageEl.innerText = (stage || 'lead').toUpperCase();
            if (approveBtn) {
                approveBtn.disabled = !!approved;
                approveBtn.innerText = approved ? 'FINAL APPROVED' : 'FINAL APPROVAL';
                approveBtn.className = approved
                    ? 'px-5 py-2 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 text-[10px] font-black uppercase tracking-widest cursor-default'
                    : 'px-5 py-2 rounded-lg bg-taurusGold text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all';
            }
        }

        async function finalApproveProject() {
            if (!editingProjectId) return;
            const confirmed = await systemConfirm('FINAL APPROVAL', 'Confirm final approval and close the workflow?', 'check-circle');
            if (!confirmed) return;

            try {
                await db.collection('projects').doc(editingProjectId).update({
                    finalApproved: true,
                    approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'completed'
                });
                await updateWorkflow(editingProjectId, 'approved', { source: 'admin' });
                setWorkflowUI('approved', true);
                systemAlert('SUCCESS', 'Project finalized.', 'check-circle');
            } catch (e) {
                console.error('Final approval failed', e);
                systemAlert('ERROR', 'Final approval failed: ' + e.message, 'x-circle');
            }
        }

        async function getExistingProjectIdForMessage(messageId) {
            if (!db || !messageId) return null;
            try {
                const msgDoc = await db.collection('messages').doc(messageId).get();
                const msgData = msgDoc.exists ? msgDoc.data() : null;
                if (msgData?.projectId) return msgData.projectId;

                let projectId = null;
                const projSnap = await db.collection('projects').where('messageId', '==', messageId).limit(1).get();
                if (!projSnap.empty) projectId = projSnap.docs[0].id;
                if (!projectId) {
                    const projSnap2 = await db.collection('projects').where('sourceMessageId', '==', messageId).limit(1).get();
                    if (!projSnap2.empty) projectId = projSnap2.docs[0].id;
                }

                if (projectId && msgDoc.exists) {
                    await db.collection('messages').doc(messageId).update({
                        projectId: projectId,
                        dossierCreated: true
                    });
                }
                return projectId;
            } catch (e) {
                console.warn('Project lookup failed:', e);
                return null;
            }
        }

        async function getExistingQuoteIdForMessage(messageId) {
            if (!db || !messageId) return null;
            try {
                const msgDoc = await db.collection('messages').doc(messageId).get();
                const msgData = msgDoc.exists ? msgDoc.data() : null;
                if (msgData?.quoteId) return msgData.quoteId;

                const quoteSnap = await db.collection('quotes').where('messageId', '==', messageId).limit(1).get();
                if (!quoteSnap.empty) return quoteSnap.docs[0].id;
                return null;
            } catch (e) {
                console.warn('Quote lookup failed:', e);
                return null;
            }
        }

        async function getOrCreateProjectFromMessage(messageId, messageOverride = null, autoPipeline = false) {
            if (!db || !messageId) return null;
            const existingId = await getExistingProjectIdForMessage(messageId);
            if (existingId) return existingId;

            const response = await fetch('/api/agent?action=studio-lead-process', {
                method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Lead preparation could not be completed.');
            return result.projectId;
        }

        // --- AUTO PIPELINE: Message -> Dossier -> Quote -> Project -> Docs ---
        async function autoCreateDossierFromMessage(messageId, message) {
            if (!AUTO_PIPELINE_ENABLED || !db || !messageId || !message) return;
            if (message.type === 'report' || message.email === 'tracker@taurus.sys') return;
            if (message.dossierCreated || message.projectId) return;
            if (autoPipelineLocks.has(messageId)) return;

            autoPipelineLocks.add(messageId);
            try {
                const response = await fetch('/api/agent?action=studio-lead-process', {
                    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messageId })
                });
                if (!response.ok) throw new Error('Lead preparation is pending.');
            } catch (_) { console.warn('Lead preparation will retry on the next workspace sync.'); }
            finally { autoPipelineLocks.delete(messageId); }
        }
