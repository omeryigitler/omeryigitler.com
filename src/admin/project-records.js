        // ============================================
        // PROJECT MANAGEMENT SYSTEM (Phase 3)
        // ============================================

        /**
         * Generate next project number in format PR-YYYY-NNN
         * @returns {Promise<string>} Project number like "PR-2026-001"
         */
        async function getNextProjectNumber() {
            if (!db) return null;

            try {
                const year = new Date().getFullYear();
                const prefix = `PR-${year}-`;

                const snapshot = await db.collection('projects')
                    .where('projectNumber', '>=', prefix + '000')
                    .where('projectNumber', '<', prefix + 'ZZZ')
                    .orderBy('projectNumber', 'desc')
                    .limit(1)
                    .get();

                if (snapshot.empty) {
                    return `${prefix}001`;
                }

                const lastNumber = parseInt(snapshot.docs[0].data().projectNumber.split('-')[2]);
                const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
                return `${prefix}${nextNumber}`;

            } catch (error) {
                console.error('❌ Error generating project number:', error);
                const timestamp = Date.now().toString().slice(-6);
                return `PR-${new Date().getFullYear()}-${timestamp}`;
            }
        }

        /**
         * Save project to Firestore
         * @param {Object} projectData - Project data
         * @returns {Promise<string>} Project document ID
         */
        async function saveProjectToFirestore(projectData) {
            if (!db) return null;

            try {
                // Get or create client
                const client = await getOrCreateClient(projectData.clientEmail, projectData.clientName);
                if (!client) {
                    console.error('Failed to get/create client');
                    return null;
                }

                // Generate project number
                const projectNumber = await getNextProjectNumber();

                const initialStage = normalizeStage(projectData.workflowStage || 'lead');

                // Prepare project document
                const project = {
                    projectNumber: projectNumber,
                    name: projectData.name || projectData.projectName || 'Untitled Project',
                    projectName: projectData.projectName || projectData.name || 'Untitled Project',

                    // Client info
                    clientId: client.id,
                    clientName: projectData.clientName || client.data.name,
                    clientEmail: projectData.clientEmail || client.data.email,

                    // Status
                    status: projectData.status || 'active',
                    progress: projectData.progress || 0,

                    // Workflow
                    workflowStage: initialStage,
                    workflowHistory: [
                        {
                            stage: initialStage,
                            source: projectData.autoPipeline ? 'auto' : 'manual',
                            at: new Date().toISOString()
                        }
                    ],
                    finalApproved: !!projectData.finalApproved,
                    autoPipeline: !!projectData.autoPipeline,

                    // Dates
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    startDate: projectData.startDate || null,
                    dueDate: projectData.dueDate || null,
                    completedAt: null,

                    // Financial
                    budget: projectData.budget || 0,
                    currency: projectData.currency || 'TRY',

                    // Relationships
                    quoteId: projectData.quoteId || null,
                    messageId: projectData.messageId || null,
                    sourceMessageId: projectData.messageId || null,

                    // Details
                    description: projectData.description || '',
                    notes: projectData.notes || '',

                    // Specs
                    siteType: projectData.siteType || null,
                    designType: projectData.designType || null,
                    pageCount: projectData.pageCount || null,
                    deliverySpeed: projectData.deliverySpeed || null,
                    maintenanceLevel: projectData.maintenanceLevel || null,
                    selectedAddons: projectData.selectedAddons || [],
                    country: projectData.country || null,

                    // Studio Workspace
                    studio: projectData.studio || {},

                    // Metadata
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                };

                // Save to Firestore
                const docRef = await db.collection('projects').add(project);
                console.log('✅ Project saved:', projectNumber, docRef.id);

                // Update client stats
                await updateClientStats(client.id, 'project', docRef.id);

                // Update quote if from quote
                if (projectData.quoteId) {
                    await db.collection('quotes').doc(projectData.quoteId).update({
                        projectId: docRef.id,
                        status: 'accepted'
                    });
                }

                // Update message if from message
                if (projectData.messageId) {
                    await db.collection('messages').doc(projectData.messageId).update({
                        projectId: docRef.id,
                        status: 'project-created'
                    });
                }

                return docRef.id;

            } catch (error) {
                console.error('❌ Error saving project:', error);
                return null;
            }
        }

        /**
         * Create project from quote
         * @param {string} quoteId - Quote document ID
         * @returns {Promise<string>} Project document ID
         */
        async function createProjectFromQuote(quoteId) {
            if (!db || !quoteId) return null;

            try {
                const quote = await getQuote(quoteId);
                if (!quote) {
                    console.error('Quote not found');
                    return null;
                }

                const projectData = {
                    name: `${quote.siteType} Website for ${quote.clientName}`,
                    clientName: quote.clientName,
                    clientEmail: quote.clientEmail,
                    budget: quote.totalPrice,
                    currency: quote.currency,
                    quoteId: quoteId,
                    messageId: quote.messageId,
                    status: 'active',
                    description: `Project created from quote ${quote.quoteNumber}`
                };

                return await saveProjectToFirestore(projectData);

            } catch (error) {
                console.error('❌ Error creating project from quote:', error);
                return null;
            }
        }

        /**
         * Create project from message
         * @param {string} messageId - Message document ID
         * @returns {Promise<string>} Project document ID
         */
        async function createProjectFromMessage(messageId) {
            try {
                return await getOrCreateProjectFromMessage(messageId, null, false);
            } catch (error) {
                console.error('❌ Error creating project from message:', error);
                return null;
            }
        }

        /**
         * Migrate localStorage projects to Firestore (one-time)
         */
        async function migrateLocalStorageProjects() {
            const localProjects = JSON.parse(localStorage.getItem('projects') || '[]');

            if (localProjects.length === 0) {
                console.log('📦 No local projects to migrate');
                return 0;
            }

            console.log(`📦 Migrating ${localProjects.length} projects from localStorage...`);
            let migrated = 0;

            for (const project of localProjects) {
                try {
                    const projectData = {
                        name: project.name || project.projectName || 'Untitled Project',
                        clientName: project.client || project.clientName || 'Unknown',
                        clientEmail: project.clientEmail || 'unknown@example.com',
                        status: project.status || 'active',
                        progress: project.progress || 0,
                        startDate: project.startDate || null,
                        dueDate: project.dueDate || null,
                        budget: project.budget || 0,
                        description: project.description || ''
                    };

                    await saveProjectToFirestore(projectData);
                    migrated++;
                    console.log(`✅ Migrated: ${projectData.name}`);
                } catch (error) {
                    console.error(`❌ Failed to migrate ${project.name}:`, error);
                }
            }

            // Backup old data
            localStorage.setItem('projects_backup', localStorage.getItem('projects'));
            localStorage.removeItem('projects');

            console.log(`✅ Migration complete! ${migrated}/${localProjects.length} projects migrated`);
            return migrated;
        }
