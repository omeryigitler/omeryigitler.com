        // --- DATA LOADERS ---
        let currentMessageFilter = 'all';
        let searchQuery = '';
        let isEnterPressed = false;

        function handleGlobalSearch(val) {
            searchQuery = val.toLowerCase().trim();
            if (activeTab === 'messages') loadMessages();
            if (activeTab === 'projects') loadProjects();
        }

        function handleSearchKeyDown(e) {
            if (e.key === 'Enter') {
                isEnterPressed = true;
                if (activeTab === 'messages') loadMessages();
                if (activeTab === 'projects') loadProjects();
                setTimeout(() => { isEnterPressed = false; }, 2000);
            }
        }

        function escapeAdminText(value) {
            return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
        }

        function highlightMatch(text, query) {
            const source = String(text ?? '');
            if (!query) return escapeAdminText(source);
            const literal = String(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const parts = source.split(new RegExp(`(${literal})`, 'gi'));
            return parts.map((part, index) => index % 2 ? `<span class="search-highlight">${escapeAdminText(part)}</span>` : escapeAdminText(part)).join('');
        }

        function filterMessages(f) {
            currentMessageFilter = f;
            document.getElementById('filter-all-messages').className = f === 'all' ? 'flex-1 justify-center px-6 py-2 rounded-lg bg-taurusGold text-black text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all' : 'flex-1 justify-center px-6 py-2 rounded-lg text-gray-400 text-[10px] font-black uppercase tracking-widest whitespace-nowrap hover:text-white transition-all';
            document.getElementById('filter-unread-messages').className = f === 'unread' ? 'flex-1 justify-center px-6 py-2 rounded-lg bg-taurusGold text-black text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all' : 'flex-1 justify-center px-6 py-2 rounded-lg text-gray-400 text-[10px] font-black uppercase tracking-widest whitespace-nowrap hover:text-white transition-all';
            loadMessages();
        }
