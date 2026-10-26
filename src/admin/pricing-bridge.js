        // POST MESSAGE LISTENER - Pricing Tool Integration
        // POST MESSAGE LISTENER - Pricing Tool Integration
        async function storeGeneratedPdfForProject(docType, dataUri, projectId) {
            if (!docType || !projectId) return;
            let key = null;
            if (!USE_SERVER_PDF && dataUri) {
                try {
                    key = `project_pdf_${docType}_${projectId}`;
                    localStorage.setItem(key, dataUri);
                } catch (e) {
                    console.warn("Local PDF storage failed:", e.message);
                    key = null;
                }
            }
            try {
                const updates = {
                    [`documents.${docType}GeneratedAt`]: firebase.firestore.FieldValue.serverTimestamp(),
                    [`documents.${docType}Ready`]: true,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                };
                if (key) {
                    updates[`documents.${docType}LocalKey`] = key;
                }
                await db.collection('projects').doc(projectId).update(updates);
                if (docType === 'contract') {
                    await updateWorkflow(projectId, 'review', { source: 'manual' });
                }
            } catch (e) {
                console.warn("PDF metadata save failed:", e.message);
            }
        }

        window.addEventListener('message', async (event) => {
            if (!event.data) return;

            if (event.data.type === 'PRICING_TOOL_READY' || event.data.type === 'PRICING_TOOL_PONG') {
                markPricingToolReady();
                return;
            }

            // Handle Direct PDF Generation (From Admin "Generate" button)
            // Handle Direct PDF Generation (From Admin "Generate" button)
            if (event.data.type === 'PDF_GENERATED') {
                console.log('📄 PDF Generated via Remote Command', event.data.payload);
                clearPdfTimeout();

                // Auto-pipeline PDF capture (queue-aware)
                if (pdfJobActive && event.data.payload) {
                    const payload = event.data.payload;
                    const docType = pdfJobActive.docType;
                    const dataUri = docType === 'quote' ? payload.quotePdf : payload.contractPdf;

                    if (dataUri) {
                        await storeGeneratedPdfForProject(docType, dataUri, pdfJobActive.projectId);
                        if (docType === 'contract') {
                            await updateWorkflow(pdfJobActive.projectId, 'review', { source: 'auto' });
                        }
                    }

                    pdfJobActive = null;
                    processNextPdfJob();
                    return;
                }

                if (event.data.payload) {
                    const { quotePdf, contractPdf, fileName } = event.data.payload;
                    if (!pdfJobActive && editingProjectId) {
                        if (quotePdf) await storeGeneratedPdfForProject('quote', quotePdf, editingProjectId);
                        if (contractPdf) await storeGeneratedPdfForProject('contract', contractPdf, editingProjectId);
                    }
                    if (quotePdf) downloadBase64File(quotePdf, fileName || 'Quote.pdf');
                    if (contractPdf) downloadBase64File(contractPdf, fileName || 'Contract.pdf');
                    systemAlert('SUCCESS', 'PDF Downloaded Successfully', 'check-circle');
                } else {
                    systemAlert('ERROR', 'PDF Generation Failed', 'x-circle');
                }
                return;
            }

            // Handle Full Quote Save (New Flow)
            if (event.data.type === 'SAVE_QUOTE_FULL') {
                console.log('📨 Full Save Quote Request', event.data.payload);
                const payload = event.data.payload;
                const request = payload.request;
                const breakdown = payload.breakdown;
                const pricingMessageId = request?.messageId || payload.messageId || pricingContextMessageId || null;
                let pricingProjectId = payload.projectId || pricingContextProjectId || editingProjectId || null;
                if (!pricingProjectId && pricingMessageId) {
                    pricingProjectId = await getOrCreateProjectFromMessage(pricingMessageId, null, false);
                }

                let linkedMessageId = pricingMessageId || null;
                if (!linkedMessageId && pricingProjectId) {
                    try {
                        const projDoc = await db.collection('projects').doc(pricingProjectId).get();
                        if (projDoc.exists) {
                            const pdata = projDoc.data();
                            linkedMessageId = pdata?.messageId || pdata?.sourceMessageId || null;
                        }
                    } catch (e) {
                        console.warn('Failed to resolve messageId for project:', e);
                    }
                }

                const quoteData = {
                    clientName: request.customerName,
                    clientEmail: request.customerEmail || '',
                    country: request.country,
                    siteType: request.siteType,
                    pageCount: request.pageCount,
                    totalPrice: breakdown.finalTotal,
                    breakdown: breakdown,
                    currency: request.country === 'MT' ? 'EUR' : 'TRY',
                    projectId: pricingProjectId || null,
                    notes: 'Design: ' + request.designType + ', Speed: ' + request.deliverySpeed + ', Maint: ' + request.maintenanceLevel
                };


                const id = await saveQuoteToFirestore(quoteData, linkedMessageId);

                if (id) {
                    console.log('✅ Quote successfully saved with ID:', id);

                    const projectUpdates = {
                        quoteId: id,
                        budget: breakdown.finalTotal,
                        currency: request.country === 'MT' ? 'EUR' : 'TRY',
                        breakdown: breakdown, // Save full breakdown for Financials Tab
                        siteType: request.siteType, // Sync specs
                        designType: request.designType,
                        pageCount: request.pageCount,
                        deliverySpeed: request.deliverySpeed,
                        selectedAddons: request.selectedAddons || [],
                        status: 'active', // Ensure it's active
                        workflowStage: 'active',
                        startData: firebase.firestore.FieldValue.serverTimestamp(),
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    };

                let projectId = pricingProjectId;

                    // CASE 1: Updating Existing Project
                    if (projectId) {
                        try {
                            await db.collection('projects').doc(projectId).update(projectUpdates);
                            console.log('✅ Project synced with new quote data:', projectId);
                            await updateWorkflow(projectId, 'proposal', { source: 'pricing', quoteId: id });
                            await updateWorkflow(projectId, 'active', { source: 'pricing' });

                            event.source.postMessage({ type: 'QUOTE_SAVED', success: true, quoteId: id }, '*'); // Close iframe loader?

                            // Return to project view
                            switchTab('projects');
                            openProjectModal(projectId); // Re-open to show new data
                            // alert('Project Updated Successfully!');

                        } catch (err) {
                            console.error('❌ Failed to sync project with quote:', err);
                            alert('Error updating project: ' + err.message);
                        }
                        pricingContextProjectId = null;
                        pricingContextMessageId = null;
                    }
                    // CASE 2: Creating NEW Project from Quote
                    else {
                        try {
                            console.log('✨ Creating NEW Project from Quote...');
                            const newProjectData = {
                                clientName: request.customerName,
                                clientEmail: request.customerEmail,
                                name: `Project for ${request.customerName}`,
                                status: 'active',
                                budget: breakdown.finalTotal,
                                currency: request.country === 'MT' ? 'EUR' : 'TRY',
                                quoteId: id,
                                description: `Generated from Proposal #${id}. Sites: ${request.siteType}, Pages: ${request.pageCount}`
                            };

                            const createdId = await saveProjectToFirestore(newProjectData);
                            projectId = createdId; // Capture for PDF logic

                            if (projectId) {
                                // Apply the detailed updates that saveProjectToFirestore missed
                                await db.collection('projects').doc(projectId).update(projectUpdates);

                                console.log('✅ New Project Created:', projectId);
                                await updateWorkflow(projectId, 'proposal', { source: 'pricing', quoteId: id });
                                await updateWorkflow(projectId, 'active', { source: 'pricing' });
                                // alert('New Project Created & Linked to Quote!');
                            }
                        } catch (err) {
                            console.error('❌ Failed to create project from quote:', err);
                            alert('Error creating project: ' + err.message);
                        }
                    }

                    // --- PDF UPLOAD LOGIC ---
                    let freshDocuments = null;

                    if (projectId && (payload.quotePdf || payload.contractPdf)) {
                        console.log('📂 Uploading generated PDFs to Storage for Project:', projectId);
                        systemAlert('SYNC', 'Saving Project & Uploading PDFs...', 'cloud-upload');

                        try {
                            // FAILSAFE: Force close modal after 20 seconds regardless of what happens
                            setTimeout(() => {
                                const modal = document.getElementById('system-modal');
                                const title = document.getElementById('modal-title').innerText;
                                if (!modal.classList.contains('hidden') && title === 'SYNC') {
                                    console.warn("⚠️ Failsafe triggered: Upload took too long.");
                                    systemAlert('UPLOAD ERROR', "Operation timed out completely.", 'clock');
                                }
                            }, 20000);

                            // ---------------------------------------------------------
                            // CLOUD UPLOAD DISABLED (Client-side Only)
                            // ---------------------------------------------------------
                            /*
                            const docUpdates = {};

                            if (payload.quotePdf) {
                                console.log('...Uploading Quote...');
                                const quoteUrl = await uploadDataUrl(payload.quotePdf, `projects/${projectId}/Quote_${id}.pdf`);
                                if (quoteUrl) docUpdates.quoteUrl = quoteUrl;
                            }

                            if (payload.contractPdf) {
                                console.log('...Uploading Contract...');
                                const contractUrl = await uploadDataUrl(payload.contractPdf, `projects/${projectId}/Contract_${id}.pdf`);
                                if (contractUrl) docUpdates.contractUrl = contractUrl;
                            }

                            const finalUpdate = {};
                            if (docUpdates.quoteUrl) finalUpdate['documents.quoteUrl'] = docUpdates.quoteUrl;
                            if (docUpdates.contractUrl) finalUpdate['documents.contractUrl'] = docUpdates.contractUrl;

                            if (Object.keys(finalUpdate).length > 0) {
                                await db.collection('projects').doc(projectId).update(finalUpdate);
                                console.log('✅ Documents attached to project.');
                                freshDocuments = docUpdates; // Capture for UI update
                            } else {
                                console.warn("⚠️ Upload ran but no URLs returned. Proceeding without linking docs.");
                            }
                            */

                            // Cloud upload disabled - no documents uploaded
                            const docUpdates = {}; // Empty since we're not uploading

                            // Auto-Download for immediate access
                            if (payload.quotePdf) downloadBase64File(payload.quotePdf, `Quote_${id}.pdf`);

                            if (payload.contractPdf) downloadBase64File(payload.contractPdf, `Contract_${id}.pdf`);

                            // ALWAYS transition to success, even if PDFs failed (Project is still saved)
                            systemAlert('SUCCESS', 'Project finalized and PDFs downloaded.', 'check-circle');

                        } catch (e) {
                            console.error("Failed to upload PDFs:", e);
                            systemAlert('UPLOAD ERROR', "Failed to upload to Cloud Storage: " + e.message, 'x-circle');
                        }
                    } else {
                        // Project Saved but no PDF payload requested?
                        // We should probably show Success if we didn't enter the PDF block
                        // But usually SAVE_QUOTE_FULL implies PDFs.
                        // For now, let's assume if we didn't enter PDF block, we don't need to close SYNC because we never opened it?
                        // Wait, SYNC is opened inside the PDF block. Correct.
                    }

                    if (projectId) {
                        // --- LOCAL STORAGE PERSISTENCE (Client-Side) ---
                        // Avoid localStorage for large PDFs; mark metadata only
                        if (payload.quotePdf) {
                            await storeGeneratedPdfForProject('quote', payload.quotePdf, projectId);
                        }
                        if (payload.contractPdf) {
                            await storeGeneratedPdfForProject('contract', payload.contractPdf, projectId);
                        }

                        event.source.postMessage({ type: 'QUOTE_SAVED', success: true, quoteId: id }, '*');

                        // Close the pricing tool modal
                        closePricingModal();

                        // Switch to projects tab and show the new project
                        switchTab('projects');

                        // Open modal with fresh data
                        openProjectModal(projectId);

                        systemAlert('SUCCESS', 'Project Saved Successfully', 'check-circle');
                    }

                    pricingContextProjectId = null;
                    pricingContextMessageId = null;

                    // Refresh local view if needed
                    if (currentMessageFilter) filterMessages(currentMessageFilter);
                } else {
                    console.error('❌ Failed to save quote. saveQuoteToFirestore returned null.');
                    alert('Failed to save quote database record.');
                }
                return;
            }

            // Legacy Handler
            if (event.data.type === 'SAVE_QUOTE') {
                console.log('📨 Save Quote Request (Legacy)');
                const id = await saveQuoteToFirestore(event.data.data, event.data.messageId);
                if (id) {
                    event.source.postMessage({ type: 'QUOTE_SAVED', success: true, quoteId: id }, '*');
                    systemAlert('SUCCESS', 'Proposal saved successfully.', 'check-circle');
                } else {
                    event.source.postMessage({ type: 'QUOTE_SAVED', success: false }, '*');
                    systemAlert('ERROR', 'Proposal save failed.', 'x-circle');
                }
            }

        });
