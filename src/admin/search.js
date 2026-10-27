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

        function highlightMatch(text, query) {
            if (!query) return text;
            try {
                const regex = new RegExp(`(${query})`, 'gi');
                return String(text).replace(regex, '<span class="search-highlight">$1</span>');
            } catch (e) { return text; }
        }

        function filterMessages(f) {
            currentMessageFilter = f;
            document.getElementById('filter-all-messages').className = f === 'all' ? 'flex-1 justify-center px-6 py-2 rounded-lg bg-taurusGold text-black text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all' : 'flex-1 justify-center px-6 py-2 rounded-lg text-gray-400 text-[10px] font-black uppercase tracking-widest whitespace-nowrap hover:text-white transition-all';
            document.getElementById('filter-unread-messages').className = f === 'unread' ? 'flex-1 justify-center px-6 py-2 rounded-lg bg-taurusGold text-black text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all' : 'flex-1 justify-center px-6 py-2 rounded-lg text-gray-400 text-[10px] font-black uppercase tracking-widest whitespace-nowrap hover:text-white transition-all';
            loadMessages();
        }
