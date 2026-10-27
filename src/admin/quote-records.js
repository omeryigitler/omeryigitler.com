        // ============================================
        // QUOTE MANAGEMENT SYSTEM (Phase 2)
        // ============================================

        /**
         * Generate next quote number in format Q-YYYY-NNN
         * @returns {Promise<string>} Quote number like "Q-2026-001"
         */
        async function getNextQuoteNumber() {
            if (!db) return null;

            try {
                const year = new Date().getFullYear();
                const prefix = `Q-${year}-`;

                // Get all quotes from this year
                const snapshot = await db.collection('quotes')
                    .where('quoteNumber', '>=', prefix + '000')
                    .where('quoteNumber', '<', prefix + 'ZZZ')
                    .orderBy('quoteNumber', 'desc')
                    .limit(1)
                    .get();

                if (snapshot.empty) {
                    // First quote of the year
                    return `${prefix}001`;
                }

                // Get last number and increment
                const lastQuote = snapshot.docs[0].data();
                const lastNumber = parseInt(lastQuote.quoteNumber.split('-')[2]);
                const nextNumber = (lastNumber + 1).toString().padStart(3, '0');

                return `${prefix}${nextNumber}`;

            } catch (error) {
                console.error('❌ Error generating quote number:', error);
                // Fallback to timestamp-based
                const timestamp = Date.now().toString().slice(-6);
                return `Q-${new Date().getFullYear()}-${timestamp}`;
            }
        }

        /**
         * Upload Data URL to Firebase Storage
         * @param {string} dataUrl - Base64 Data URL
         * @param {string} path - Storage path
         * @returns {Promise<string>} Download URL
         */
        async function uploadDataUrl(dataUrl, path) {
            try {
                // Timeout Promise
                const timeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Upload timed out after 15s")), 15000)
                );

                // Actual Upload Promise
                const uploadTask = async () => {
                    const res = await fetch(dataUrl);
                    const blob = await res.blob();
                    console.log(`📤 Starting Upload. Size: ${(blob.size / 1024).toFixed(2)} KB`);

                    const storageRef = firebase.storage().ref();
                    const fileRef = storageRef.child(path);
                    await fileRef.put(blob);
                    return await fileRef.getDownloadURL();
                };

                // Race
                return await Promise.race([uploadTask(), timeout]);

            } catch (e) {
                console.error("Upload failed details:", e);
                // alert("Storage Error: " + e.message + "\nCheck console for details.");
                return null;
            }
        }


        /**
         * Helper to trigger download of base64 file
         */
        function dataUrlToBlob(dataUrl) {
            if (!dataUrl || typeof dataUrl !== 'string') return null;
            const parts = dataUrl.split(',');
            if (parts.length < 2) return null;
            const meta = parts[0];
            const base64 = parts[1];
            const match = meta.match(/data:(.*);base64/);
            const mime = match ? match[1] : 'application/octet-stream';
            const binary = atob(base64);
            const len = binary.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
            return new Blob([bytes], { type: mime });
        }

        function downloadBlobFile(blob, fileName) {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 5000);
        }

        function downloadBase64File(base64Data, fileName) {
            const blob = dataUrlToBlob(base64Data);
            if (blob) {
                downloadBlobFile(blob, fileName);
                return;
            }
            const link = document.createElement('a');
            link.href = base64Data;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        function blobToDataUrl(blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Failed to read PDF blob'));
                reader.readAsDataURL(blob);
            });
        }

        function startPdfTimeout(docType) {
            clearPdfTimeout();
            pendingPdfTimeout = setTimeout(() => {
                systemAlert('ERROR', `${docType.toUpperCase()} PDF generation timed out.`, 'clock');
            }, PDF_TIMEOUT_MS);
        }

        function clearPdfTimeout() {
            if (pendingPdfTimeout) {
                clearTimeout(pendingPdfTimeout);
                pendingPdfTimeout = null;
            }
        }

        function markPricingToolReady() {
            pricingToolReady = true;
            pricingToolLastPing = Date.now();
            if (pricingToolPingTimer) {
                clearTimeout(pricingToolPingTimer);
                pricingToolPingTimer = null;
            }
        }

        function sendPricingToolPing() {
            const iframe = document.getElementById('pricing-iframe');
            if (!iframe || !iframe.contentWindow) return;
            iframe.contentWindow.postMessage({ type: 'PING_PRICING_TOOL' }, '*');
        }

        function initPricingToolBridge() {
            const iframe = document.getElementById('pricing-iframe');
            if (!iframe) return;
            iframe.addEventListener('load', () => {
                pricingToolReady = false;
                sendPricingToolPing();
            });
            sendPricingToolPing();
        }

        window.addEventListener('load', initPricingToolBridge);

        async function generatePdfOnServer(job) {
            const response = await fetch(PDF_SERVER_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: job.docType,
                    request: job.request,
                    breakdown: job.breakdown
                })
            });
            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                throw new Error(errText || `Server PDF failed (${response.status})`);
            }
            const buffer = await response.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let pdfBlob = null;

            const isPdf = bytes.length > 4 &&
                bytes[0] === 0x25 && // %
                bytes[1] === 0x50 && // P
                bytes[2] === 0x44 && // D
                bytes[3] === 0x46;   // F

            if (isPdf) {
                pdfBlob = new Blob([bytes], { type: 'application/pdf' });
            } else {
                // Fallback: server returned JSON-encoded bytes
                let jsonText = '';
                try {
                    jsonText = new TextDecoder().decode(bytes);
                    const data = JSON.parse(jsonText);
                    let byteArray = null;
                    if (data && Array.isArray(data.data)) {
                        byteArray = data.data;
                    } else if (Array.isArray(data)) {
                        byteArray = data;
                    } else if (data && typeof data === 'object') {
                        const keys = Object.keys(data)
                            .filter(k => !Number.isNaN(Number(k)))
                            .sort((a, b) => Number(a) - Number(b));
                        byteArray = keys.map(k => data[k]);
                    }
                    if (byteArray && byteArray.length) {
                        pdfBlob = new Blob([new Uint8Array(byteArray)], { type: 'application/pdf' });
                    }
                } catch (e) {
                    console.warn('PDF fallback parse failed', e);
                }
            }

            if (!pdfBlob) {
                throw new Error('PDF response invalid.');
            }

            await storeGeneratedPdfForProject(job.docType, null, job.projectId);
            if (job.download) {
                downloadBlobFile(pdfBlob, job.fileName || `${job.docType.toUpperCase()}.pdf`);
            }
        }

        /**
         * Save quote to Firestore
         * @param {Object} quoteData - Quote data from pricing tool
         * @param {string} messageId - Optional related message ID
         * @returns {Promise<string>} Quote document ID
         */
        async function saveQuoteToFirestore(quoteData, messageId = null) {
            if (!db) return null;

            try {
                // Get or create client
                const client = await getOrCreateClient(quoteData.clientEmail, quoteData.clientName);
                if (!client) {
                    console.error('Failed to get/create client');
                    return null;
                }

                let existingQuoteId = null;
                if (messageId) {
                    try {
                        const msgDoc = await db.collection('messages').doc(messageId).get();
                        if (msgDoc.exists && msgDoc.data()?.quoteId) {
                            existingQuoteId = msgDoc.data().quoteId;
                        }
                    } catch (e) {
                        console.warn('Quote lookup (message) failed:', e);
                    }
                    if (!existingQuoteId) {
                        const existingSnap = await db.collection('quotes').where('messageId', '==', messageId).limit(1).get();
                        if (!existingSnap.empty) {
                            existingQuoteId = existingSnap.docs[0].id;
                        }
                    }
                }
                if (!existingQuoteId && quoteData.projectId) {
                    const byProject = await db.collection('quotes').where('projectId', '==', quoteData.projectId).limit(1).get();
                    if (!byProject.empty) {
                        existingQuoteId = byProject.docs[0].id;
                    }
                }

                if (existingQuoteId) {
                    const updates = {
                        clientId: client.id,
                        clientName: quoteData.clientName || 'Anonymous',
                        clientEmail: quoteData.clientEmail,
                        country: quoteData.country || 'TR',
                        siteType: quoteData.siteType || 'Unknown',
                        pageCount: quoteData.pageCount || 0,
                        totalPrice: quoteData.totalPrice || 0,
                        currency: quoteData.country === 'MT' ? 'EUR' : 'TRY',
                        breakdown: quoteData.breakdown || {},
                        status: 'draft',
                        projectId: quoteData.projectId || null,
                        notes: quoteData.notes || '',
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    await db.collection('quotes').doc(existingQuoteId).update(updates);

                    if (messageId) {
                        await db.collection('messages').doc(messageId).update({
                            quoteId: existingQuoteId,
                            status: 'quoted'
                        });
                    }

                    return existingQuoteId;
                }

                // Generate quote number
                const quoteNumber = await getNextQuoteNumber();

                // Prepare quote document
                const quote = {
                    quoteNumber: quoteNumber,

                    // Client info
                    clientId: client.id,
                    clientName: quoteData.clientName || 'Anonymous',
                    clientEmail: quoteData.clientEmail,

                    // Pricing data
                    country: quoteData.country || 'TR',
                    siteType: quoteData.siteType || 'Unknown',
                    pageCount: quoteData.pageCount || 0,
                    totalPrice: quoteData.totalPrice || 0,
                    currency: quoteData.country === 'MT' ? 'EUR' : 'TRY',

                    // Detailed breakdown
                    breakdown: quoteData.breakdown || {},

                    // Status
                    status: 'draft',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    sentAt: null,

                    // Relationships
                    messageId: messageId,
                    projectId: quoteData.projectId || null,

                    // Optional
                    pdfUrl: null,
                    notes: quoteData.notes || ''
                };

                // Save to Firestore
                const docRef = await db.collection('quotes').add(quote);
                console.log('✅ Quote saved:', quoteNumber, docRef.id);

                // Update client stats
                await updateClientStats(client.id, 'quote', docRef.id);

                // If linked to message, update message
                if (messageId) {
                    await db.collection('messages').doc(messageId).update({
                        quoteId: docRef.id,
                        status: 'quoted'
                    });
                }

                return docRef.id;

            } catch (error) {
                console.error('❌ Error saving quote:', error);
                return null;
            }
        }

        /**
         * Get quote by ID
         * @param {string} quoteId - Quote document ID
         * @returns {Promise<Object>} Quote data
         */
        async function getQuote(quoteId) {
            if (!db || !quoteId) return null;

            try {
                const doc = await db.collection('quotes').doc(quoteId).get();
                if (!doc.exists) return null;

                return { id: doc.id, ...doc.data() };
            } catch (error) {
                console.error('❌ Error getting quote:', error);
                return null;
            }
        }
