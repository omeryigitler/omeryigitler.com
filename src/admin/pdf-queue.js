        // --- PDF JOB QUEUE (Auto Docs) ---
        const pdfJobQueue = [];
        let pdfJobActive = null;

        function enqueuePdfJob(job) {
            pdfJobQueue.push(job);
            if (!pdfJobActive) processNextPdfJob();
        }

        async function processNextPdfJob() {
            if (pdfJobActive || pdfJobQueue.length === 0) return;
            const job = pdfJobQueue.shift();
            pdfJobActive = job;

            if (USE_SERVER_PDF) {
                startPdfTimeout(job.docType);
                try {
                    await generatePdfOnServer(job);
                    if (job.download) {
                        systemAlert('SUCCESS', 'PDF ready.', 'check-circle');
                    }
                } catch (e) {
                    console.error('Server PDF failed:', e);
                    if (job.download) {
                        systemAlert('ERROR', `PDF generation failed: ${e.message}`, 'x-circle');
                    }
                } finally {
                    clearPdfTimeout();
                    pdfJobActive = null;
                    processNextPdfJob();
                }
                return;
            }

            const iframe = document.getElementById('pricing-iframe');
            if (!iframe || !iframe.contentWindow) {
                pdfJobActive = null;
                pdfJobQueue.unshift(job);
                setTimeout(processNextPdfJob, 1000);
                return;
            }

            startPdfTimeout(job.docType);
            iframe.contentWindow.postMessage({
                type: job.docType === 'quote' ? 'GENERATE_QUOTE_PDF' : 'GENERATE_CONTRACT_PDF',
                payload: {
                    request: job.request,
                    breakdown: job.breakdown
                }
            }, '*');

            // Fail-safe timeout
            const activeId = job.id;
            setTimeout(() => {
                if (pdfJobActive && pdfJobActive.id === activeId) {
                    pdfJobActive = null;
                    processNextPdfJob();
                }
            }, PDF_TIMEOUT_MS);
        }
