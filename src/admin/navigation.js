        // --- UI LOGIC ---
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar-menu');
            sidebar.classList.toggle('-translate-x-full');
            sidebar.classList.toggle('open');

            // Body scroll lock on mobile
            if (window.innerWidth < 1024) {
                document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
            }
        }

        let activeTab = 'dashboard';
        function switchTab(tabId) {
            activeTab = tabId;

            // Hide all views
            document.getElementById('view-dashboard').classList.add('hidden');
            document.getElementById('view-messages').classList.add('hidden');
            document.getElementById('view-pricing').classList.add('hidden');
            document.getElementById('view-quotes').classList.add('hidden'); // NEW
            document.getElementById('view-clients').classList.add('hidden'); // NEW
            document.getElementById('view-projects').classList.add('hidden');
            document.getElementById('view-intelligence').classList.add('hidden');
            document.getElementById('view-settings').classList.add('hidden');

            // Show selected view
            if (tabId === 'dashboard') document.getElementById('view-dashboard').classList.remove('hidden');
            else if (tabId === 'messages') document.getElementById('view-messages').classList.remove('hidden');
            else if (tabId === 'pricing') document.getElementById('view-pricing').classList.remove('hidden');
            else if (tabId === 'quotes') document.getElementById('view-quotes').classList.remove('hidden'); // NEW
            else if (tabId === 'clients') document.getElementById('view-clients').classList.remove('hidden'); // NEW
            else if (tabId === 'projects') document.getElementById('view-projects').classList.remove('hidden');
            else if (tabId === 'intelligence') document.getElementById('view-intelligence').classList.remove('hidden');
            else if (tabId === 'settings') document.getElementById('view-settings').classList.remove('hidden');

            // Update nav active state
            document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active', 'text-white'));
            const activeNav = document.getElementById('nav-' + tabId);
            if (activeNav) {
                activeNav.classList.add('active', 'text-white');
            }

            // Update Title (Desktop only or shared)
            const titles = {
                'dashboard': 'Dashboard Overview',
                'messages': 'Communications Hub',
                'pricing': 'Pricing Tool',
                'quotes': 'Proposals Management', // NEW
                'clients': 'Client Management', // NEW
                'projects': 'Operational Matrix',
                'settings': 'Security Protocols',
                'intelligence': 'Visitor Intelligence Matrix'
            };
            const titleEl = document.getElementById('page-title');
            if (titleEl) titleEl.innerText = titles[tabId];

            // Load relevant data
            if (tabId === 'messages') loadMessages();
            if (tabId === 'quotes') loadQuotes(); // NEW
            if (tabId === 'clients') loadClients(); // NEW
            if (tabId === 'projects') loadProjects();
            if (tabId === 'intelligence') {
                ensureTaurusGlobe();
                loadIntelligence();
                setTimeout(ensureTaurusGlobe, 80);
            }
            if (tabId === 'settings') initSecuritySettings();
        }
