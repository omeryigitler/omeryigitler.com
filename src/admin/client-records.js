        // ============================================
        // CLIENT MANAGEMENT SYSTEM
        // ============================================

        /**
         * Get existing client or create new one based on email
         * @param {string} email - Client email (unique identifier)
         * @param {string} name - Client name
         * @param {Object} additionalData - Optional additional client data
         * @returns {Promise<{id: string, data: Object}>} Client document
         */
        /**
         * Get existing client or create new one based on email (TRANSACTION-BASED)
         * @param {string} email - Client email (unique identifier)
         * @param {string} name - Client name
         * @param {Object} additionalData - Optional additional client data
         * @returns {Promise<{id: string, data: Object}>} Client document
         */
        async function getOrCreateClient(email, name, additionalData = {}) {
            if (!db) return null;

            try {
                // Normalize email or generate placeholder
                let normalizedEmail = email ? email.toLowerCase().trim() : '';

                if (!normalizedEmail) {
                    // Generate a placeholder email based on name + timestamp
                    const nameSlug = (name || 'anonymous').toLowerCase().replace(/[^a-z0-9]/g, '');
                    normalizedEmail = `no-email-${nameSlug}-${Date.now()}@system.local`;
                    console.warn('⚠️ No email provided. Generated placeholder:', normalizedEmail);
                }

                // Create deterministic document ID from email
                // Use base64 encoding for valid Firestore document ID
                const clientDocId = btoa(normalizedEmail).replace(/[^a-zA-Z0-9]/g, '_');

                const clientRef = db.collection('clients').doc(clientDocId);

                // Use transaction for atomic read-or-create
                return await db.runTransaction(async (transaction) => {
                    const doc = await transaction.get(clientRef);

                    if (doc.exists) {
                        // Client exists, return it
                        console.log('✅ Existing client found:', clientDocId);
                        return { id: doc.id, data: doc.data() };
                    }

                    // Client doesn't exist, create new (atomically)
                    const newClient = {
                        name: name || 'Anonymous',
                        email: normalizedEmail,
                        phone: additionalData.phone || null,
                        company: additionalData.company || null,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastContactDate: firebase.firestore.FieldValue.serverTimestamp(),

                        // Statistics
                        totalMessages: 0,
                        totalQuotes: 0,
                        totalProjects: 0,

                        // Relationships
                        messageIds: [],
                        quoteIds: [],
                        projectIds: []
                    };

                    transaction.set(clientRef, newClient);
                    console.log('✅ New client created:', clientDocId);

                    return { id: clientDocId, data: newClient };
                });

            } catch (error) {
                console.error('❌ Error in getOrCreateClient:', error);
                return null;
            }
        }


        /**
         * Update client statistics
         * @param {string} clientId - Client document ID
         * @param {string} type - Type of update: 'message', 'quote', or 'project'
         * @param {string} relatedId - ID of related message/quote/project
         */
        async function updateClientStats(clientId, type, relatedId) {
            if (!db || !clientId) return;

            try {
                const updateData = {
                    lastContactDate: firebase.firestore.FieldValue.serverTimestamp()
                };

                switch (type) {
                    case 'message':
                        updateData.totalMessages = firebase.firestore.FieldValue.increment(1);
                        updateData.messageIds = firebase.firestore.FieldValue.arrayUnion(relatedId);
                        break;
                    case 'quote':
                        updateData.totalQuotes = firebase.firestore.FieldValue.increment(1);
                        updateData.quoteIds = firebase.firestore.FieldValue.arrayUnion(relatedId);
                        break;
                    case 'project':
                        updateData.totalProjects = firebase.firestore.FieldValue.increment(1);
                        updateData.projectIds = firebase.firestore.FieldValue.arrayUnion(relatedId);
                        break;
                    default:
                        console.warn('Unknown update type:', type);
                        return;
                }

                await db.collection('clients').doc(clientId).update(updateData);
                console.log(`✅ Client stats updated: ${type}`);

            } catch (error) {
                console.error('❌ Error updating client stats:', error);
            }
        }

        /**
         * Get complete client history (messages, quotes, projects)
         * @param {string} clientId - Client document ID
         * @returns {Promise<Object>} Client history data
         */
        async function getClientHistory(clientId) {
            if (!db || !clientId) return null;

            try {
                // Get client data
                const clientDoc = await db.collection('clients').doc(clientId).get();
                if (!clientDoc.exists) {
                    console.error('Client not found:', clientId);
                    return null;
                }

                const clientData = clientDoc.data();

                // Get related messages
                const messages = [];
                if (clientData.messageIds && clientData.messageIds.length > 0) {
                    for (const msgId of clientData.messageIds) {
                        const msgDoc = await db.collection('messages').doc(msgId).get();
                        if (msgDoc.exists) {
                            messages.push({ id: msgId, ...msgDoc.data() });
                        }
                    }
                }

                // Get related quotes (when implemented)
                const quotes = [];
                if (clientData.quoteIds && clientData.quoteIds.length > 0) {
                    for (const quoteId of clientData.quoteIds) {
                        const quoteDoc = await db.collection('quotes').doc(quoteId).get();
                        if (quoteDoc.exists) {
                            quotes.push({ id: quoteId, ...quoteDoc.data() });
                        }
                    }
                }

                // Get related projects (when migrated to Firestore)
                const projects = [];
                if (clientData.projectIds && clientData.projectIds.length > 0) {
                    for (const projId of clientData.projectIds) {
                        const projDoc = await db.collection('projects').doc(projId).get();
                        if (projDoc.exists) {
                            projects.push({ id: projId, ...projDoc.data() });
                        }
                    }
                }

                return {
                    client: { id: clientId, ...clientData },
                    messages: messages.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds),
                    quotes: quotes,
                    projects: projects
                };

            } catch (error) {
                console.error('❌ Error getting client history:', error);
                return null;
            }
        }
