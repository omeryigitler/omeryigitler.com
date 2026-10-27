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

            let message = messageOverride;
            if (!message) {
                const messageDoc = await db.collection('messages').doc(messageId).get();
                if (!messageDoc.exists) return null;
                message = messageDoc.data();
            }
            if (!message) return null;

            const projectData = {
                name: `Project for ${message.name || 'Client'}`,
                projectName: `Project for ${message.name || 'Client'}`,
                clientName: message.name || 'Unknown Client',
                clientEmail: message.email || '',
                status: 'active',
                progress: 0,
                messageId: messageId,
                description: message.message || '',
                siteType: message.siteType || message.projectType || 'CORPORATE',
                designType: message.designType || 'TEMPLATE',
                pageCount: message.pageCount || '10',
                deliverySpeed: message.deliverySpeed || 'STANDARD',
                maintenanceLevel: message.maintenanceLevel || 'NONE',
                selectedAddons: message.selectedAddons || [],
                country: message.country || 'TR',
                workflowStage: 'lead',
                autoPipeline: !!autoPipeline,
                studio: {
                    brief: message.message || '',
                    goals: '',
                    audience: '',
                    tone: '',
                    keywords: '',
                    references: '',
                    sitemap: '',
                    content: '',
                    notes: '',
                    assets: {
                        logo: false,
                        brandbook: false,
                        copy: false,
                        images: false,
                        video: false
                    }
                }
            };

            const projectId = await saveProjectToFirestore(projectData);
            if (projectId) {
                await db.collection('messages').doc(messageId).update({
                    projectId: projectId,
                    dossierCreated: true
                });
            }
            return projectId;
        }

        // --- AUTO PIPELINE: Message -> Dossier -> Quote -> Project -> Docs ---
        async function autoCreateDossierFromMessage(messageId, message) {
            if (!AUTO_PIPELINE_ENABLED || !db || !messageId || !message) return;
            if (message.type === 'report' || message.email === 'tracker@taurus.sys') return;
            if (message.dossierCreated || message.projectId) return;
            if (autoPipelineLocks.has(messageId)) return;

            autoPipelineLocks.add(messageId);
            try {
                const projectId = await getOrCreateProjectFromMessage(messageId, message, true);
                if (!projectId) return;
                await autoGenerateQuoteFromMessage(messageId, message, projectId);
            } catch (e) {
                console.error('Auto dossier failed:', e);
            } finally {
                autoPipelineLocks.delete(messageId);
            }
        }

        async function autoGenerateQuoteFromMessage(messageId, message, projectId) {
            try {
                const existingQuoteId = await getExistingQuoteIdForMessage(messageId);
                if (existingQuoteId) return;
                const pricingConfig = getPricingConfig();
                const addons = getAddonConfig();
                const request = buildQuoteRequestFromMessage(message);
                const breakdown = calculateBreakdownFromRequest(request, pricingConfig, addons);

                const quoteData = {
                    clientName: request.customerName,
                    clientEmail: request.customerEmail || '',
                    country: request.country,
                    siteType: request.siteType,
                    pageCount: request.pageCount,
                    totalPrice: breakdown.finalTotal,
                    breakdown: breakdown,
                    currency: request.country === 'MT' ? 'EUR' : 'TRY',
                    projectId: projectId || null,
                    notes: 'AUTO: Generated from form input'
                };

                const quoteId = await saveQuoteToFirestore(quoteData, messageId);
                if (!quoteId || !projectId) return;

                await db.collection('projects').doc(projectId).update({
                    quoteId: quoteId,
                    budget: breakdown.finalTotal,
                    currency: quoteData.currency,
                    breakdown: breakdown,
                    siteType: request.siteType,
                    designType: request.designType,
                    pageCount: request.pageCount,
                    deliverySpeed: request.deliverySpeed,
                    maintenanceLevel: request.maintenanceLevel,
                    selectedAddons: request.selectedAddons || [],
                    country: request.country,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                    workflowStage: 'active'
                });

                await updateWorkflow(projectId, 'proposal', { source: 'auto', quoteId });
                await updateWorkflow(projectId, 'active', { source: 'auto' });

                // Auto-generate docs (queue)
                enqueuePdfJob({ id: `${projectId}-quote`, projectId, docType: 'quote', request, breakdown, download: false });
                enqueuePdfJob({ id: `${projectId}-contract`, projectId, docType: 'contract', request, breakdown, download: false });
            } catch (e) {
                console.error('Auto quote failed:', e);
            }
        }
