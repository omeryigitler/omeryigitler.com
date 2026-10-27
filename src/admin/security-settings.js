        // --- SECURITY SETTINGS ---
        let securitySettingsInitialized = false;

        function initSecuritySettings() {
            if (securitySettingsInitialized) return; // Only initialize once

            // --- TELEGRAM CONFIGURATION ---
            const teleTokenInput = document.getElementById('tele-token');
            const teleChatIdInput = document.getElementById('tele-chat-id');

            async function saveTelegramInitial() {
                try {
                    const doc = await db.collection('security_config').doc('telegram').get();
                    if (!doc.exists) {
                        await db.collection('security_config').doc('telegram').set({
                            botToken: '8567285538:AAHKfo8bqee43rprC-GCv3Je423R57YQkCE',
                            chatId: '6886010817',
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        console.log('✅ Telegram credentials auto-configured');
                    } else {
                        const data = doc.data();
                        if (teleTokenInput) teleTokenInput.value = data.botToken || '';
                        if (teleChatIdInput) teleChatIdInput.value = data.chatId || '';
                    }
                } catch (e) { console.error('Telegram Auto-Setup Error', e); }
            }

            // Trigger load if elements exist
            if (teleTokenInput) saveTelegramInitial();

            document.getElementById('save-telegram-btn')?.addEventListener('click', async () => {
                const token = teleTokenInput.value.trim();
                const chatId = teleChatIdInput.value.trim();

                if (!token || !chatId) {
                    await systemAlert('MISSING DATA', 'Bot Token and Chat ID are required.', 'alert-circle');
                    return;
                }

                try {
                    await db.collection('security_config').doc('telegram').set({
                        botToken: token,
                        chatId: chatId,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedBy: 'admin'
                    });
                    await systemAlert('SUCCESS', 'Telegram configuration saved!', 'check-circle');
                    await sendTelegramTest(token, chatId);
                } catch (error) {
                    await systemAlert('ERROR', 'Failed to save config: ' + error.message, 'x-circle');
                }
            });

            async function sendTelegramTest(token, chatId) {
                try {
                    const url = `https://api.telegram.org/bot${token}/sendMessage`;
                    await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: '🔔 Taurus Security System: Connection Verified ✅'
                        })
                    });
                } catch (e) {
                    console.error('Telegram Test Failed', e);
                }
            }

            securitySettingsInitialized = true;
            console.log('✅ Security settings initialized');
        }
