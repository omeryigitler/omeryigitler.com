// Admin-only extension. Existing views, inline handlers and manifest order remain intact.
const StudioOS = (() => {
    let config = null;
    let records = null;
    const root = document.createElement('div');
    root.id = 'studio-workspace';
    root.hidden = true;
    document.getElementById('view-dashboard').parentElement.append(root);

    function node(tag, text, className) {
        const element = document.createElement(tag);
        if (text) element.textContent = text;
        if (className) element.className = className;
        return element;
    }
    function button(label, handler, primary = false) {
        const element = node('button', label, primary ? 'studio-button studio-primary' : 'studio-button');
        element.type = 'button';
        element.addEventListener('click', async () => {
            element.disabled = true;
            try { await handler(); } catch (error) { notify(error.message); }
            finally { element.disabled = false; }
        });
        return element;
    }
    function notify(message) {
        const notice = document.getElementById('studio-notice');
        if (notice) notice.textContent = message;
    }
    async function api(action, body) {
        const user = window.firebase?.auth?.().currentUser;
        if (!user) throw new Error('Admin oturumu hazır değil. Yeniden giriş yapın.');
        const response = await fetch(`/api/agent?action=studio-${action}`, {
            method: body ? 'POST' : 'GET',
            headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' },
            ...(body ? { body: JSON.stringify(body) } : {})
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'İşlem tamamlanamadı.');
        return result;
    }
    function card(title, description) {
        const panel = node('section', null, 'studio-card');
        panel.append(node('h3', title));
        if (description) panel.append(node('p', description, 'studio-muted'));
        return panel;
    }
    function field(form, label, name, type = 'text', options) {
        const wrapper = node('label', label, 'studio-field');
        const input = document.createElement(options ? 'select' : 'input');
        input.name = name;
        if (options) options.forEach(value => input.append(new Option(value, value)));
        else input.type = type;
        wrapper.append(input); form.append(wrapper);
        return input;
    }
    function settingsPanel(target) {
        const panel = card('AI Control Center', 'Ücretli model çalıştırma kapalı · başlangıç bütçesi €0. Standart admin araçları AI kapalıyken kullanılabilir.');
        const form = node('form', null, 'studio-form');
        const enabled = field(form, 'AI sistemi', 'enabled', 'checkbox'); enabled.checked = config.settings.enabled;
        const mode = field(form, 'Çalışma modu', 'mode', 'text', ['FREE', 'HYBRID']); mode.value = config.settings.mode;
        const paused = field(form, 'AI çağrılarını duraklat', 'paused', 'checkbox'); paused.checked = config.settings.paused;
        const inputs = {};
        for (const [name, label, max] of [['maxRequestsPerTask', 'İşlem başına en fazla istek', 3], ['maxRequestsPerDay', 'Günlük en fazla istek (UTC)', 500], ['maxConcurrency', 'Eşzamanlı AI çağrısı', 3]]) {
            const input = field(form, label, name, 'number');
            input.min = '1'; input.max = String(max); input.required = true; input.value = config.settings[name]; inputs[name] = input;
        }
        form.append(button('Ayarları kaydet', async () => {
            if (!form.reportValidity()) return;
            const value = { ...config.settings, enabled: enabled.checked, paused: paused.checked, mode: mode.value };
            Object.entries(inputs).forEach(([key, input]) => { value[key] = Number(input.value); });
            config = await api('settings', { settings: value });
            await open('control'); notify('Ayarlar sunucuda kaydedildi.');
        }, true));
        form.addEventListener('submit', event => event.preventDefault());
        panel.append(form, button('Acil durdur', async () => {
            config = await api('settings', { settings: { ...config.settings, enabled: false, paused: true, automatic: false } });
            await open('control'); notify('Yeni AI çağrıları engellendi. Başlamış sağlayıcı çağrıları tamamlanabilir.');
        }));
        const provider = config.provider;
        panel.append(node('p', `Gemini: ${provider.configured ? 'Anahtar sunucuda tanımlı' : 'Anahtar tanımlı değil'} · ${provider.verified ? 'Ücretsiz kullanım doğrulaması geçerli' : 'Ücretsiz kullanım doğrulanmadı; çağrılar engellenir'}`, 'studio-muted'));
        panel.append(node('p', `İzinli modeller: ${provider.models.join(', ') || 'Yok'} · Doğrulama sonu: ${provider.expiresAt || 'Yok'}`, 'studio-metadata'));
        panel.append(node('p', 'HYBRID seçimi ödeme izni vermez. Ücretli adaptör, fiyat doğrulaması ve görev bazında ödeme onayı henüz bağlı değil. Otomatik işler kapalıdır.', 'studio-muted'));
        target.append(panel);
    }
    function salesPanel(target) {
        const panel = card('Sales', 'Malta ve Türkiye · kaynaklı firma kayıtları. Bu ekran otomatik araştırma yapmaz veya mesaj göndermez.');
        const form = node('form', null, 'studio-form');
        for (const [name, label, type] of [['name','Firma adı','text'],['location','Konum','text'],['industry','Sektör','text'],['website','Web sitesi (isteğe bağlı)','url'],['source','Araştırma kaynağı','url'],['notes','Doğrulanmış gözlemler','text']]) {
            const input = field(form,label,name,type); input.required = ['name','source'].includes(name); input.maxLength = name === 'notes' ? 2000 : 200;
        }
        field(form,'Pazar','country','text',['MT','TR']);
        form.append(button('Firma kaydet', async () => {
            if (!form.reportValidity()) return;
            await api('save', { kind: 'prospect', ...Object.fromEntries(new FormData(form)) });
            await open('sales'); notify('Firma kaydedildi. Aynı alan adıyla yinelenen kayıt açılmaz.');
        }, true));
        form.addEventListener('submit', event => event.preventDefault()); panel.append(form); target.append(panel);
        if (!records.prospects.length) target.append(card('Henüz firma yok', 'İlk firmanı kaynak adresiyle ekle.'));
        records.prospects.forEach(company => {
            const item = card(company.name, `${company.country} · ${company.location || 'Konum belirtilmedi'} · ${company.currency} · ${company.stage}`);
            const source = node('a', 'Araştırma kaynağı'); source.href = company.source; source.target = '_blank'; source.rel = 'noopener noreferrer'; item.append(source);
            item.append(node('p', company.notes || 'Henüz doğrulanmış gözlem eklenmedi.', 'studio-muted'));
            const stageForm = node('div', null, 'studio-form');
            const stage = field(stageForm, 'Satış aşaması', 'stage', 'text', records.stages); stage.value = company.stage;
            const contact = field(stageForm, 'İlk iletişimi gerekli izinleri kontrol ederek manuel yaptım', 'contact', 'checkbox');
            stageForm.append(button('Aşamayı kaydet', async () => { await api('transition', { kind: 'prospect', id: company.id, stage: stage.value, contactConfirmed: contact.checked }); await open('sales'); }));
            item.append(stageForm); target.append(item);
        });
    }
    function jobsPanel(target) {
        target.append(card('Studio', 'Rollere görev atayın. İzole kod yürütücüsü ve GitHub/preview bağlantısı henüz yapılandırılmadığı için görevler bekletilir; çalışan agent gösterilmez.'));
        const form = node('form', null, 'studio-form studio-card');
        field(form, 'Görev', 'title').required = true;
        field(form, 'Uzmanlık', 'role', 'text', records.roles);
        const company = field(form, 'Firma', 'prospectId', 'text', []);
        records.prospects.forEach(p => company.append(new Option(p.name, p.id)));
        let requestId = crypto.randomUUID();
        form.append(button('Görev oluştur', async () => {
            if (!form.reportValidity()) return;
            await api('save', { kind: 'job', requestId, ...Object.fromEntries(new FormData(form)) });
            requestId = crypto.randomUUID(); await open('studio');
        }, true));
        form.addEventListener('submit', event => event.preventDefault()); target.append(form);
        if (!records.jobs.length) target.append(card('Görev kuyruğu boş', 'Bir firma için araştırma, demo veya inceleme görevi oluşturabilirsiniz.'));
        records.jobs.forEach(job => {
            const item = card(job.title, `${job.role} · ${job.status} · ${job.reason || ''}`);
            if (['paused','queued','failed'].includes(job.status)) item.append(button('İptal et', async () => { await api('transition', { kind: 'job', id: job.id, status: 'cancelled' }); await open('studio'); }));
            target.append(item);
        });
    }
    function financePanel(target) {
        const panel = card('Finance', 'Mevcut fiyatlandırma ve teklif araçları korunur. Kayıtlar en son 50 çağrıyı gösterir; toplam fatura değildir.');
        panel.append(button('Fiyatlandırma', () => switchTab('pricing')), button('Teklifler', () => switchTab('quotes')));
        target.append(panel);
        if (!records.usage.length) target.append(card('AI kullanım kaydı yok', 'Gerçek model çağrıları yapıldığında burada listelenir. Bu, geçmiş sağlayıcı faturanızın sıfır olduğu anlamına gelmez.'));
        records.usage.forEach(item => target.append(card(`${item.provider} / ${item.model}`, `${item.status} · ${new Date(item.startedAt).toLocaleString('tr-TR')} · Girdi ${item.inputTokens || 0} / çıktı ${item.outputTokens || 0} token · Model maliyeti tahmini €0; kesin fatura bilinmiyor.`)));
        target.append(card('Diğer operasyon giderleri', 'Araştırma, barındırma, depolama, görsel üretimi ve insan emeği giderleri henüz bu sisteme bağlı değil. Ücretsiz AI kullanımı bu hizmetleri ücretsiz yapmaz.'));
    }
    let generation = 0;
    async function open(view) {
        switchTab('studio-' + view);
        const current = ++generation;
        root.hidden = false; root.replaceChildren();
        const header = node('header', null, 'studio-heading');
        header.append(node('span', 'OMERYIGITLER.COM / STUDIO OS', 'studio-metadata'), node('h2', { sales:'Sales', studio:'Studio', finance:'Finance', control:'AI Control Center' }[view]));
        const notice = node('p', 'Yükleniyor…', 'studio-notice'); notice.id = 'studio-notice'; notice.setAttribute('role', 'status');
        root.append(header, notice);
        try {
            if (view === 'control') config = await api('status'); else records = await api('records');
            if (current !== generation || root.hidden) return;
            notice.textContent = '';
            ({ control: settingsPanel, sales: salesPanel, studio: jobsPanel, finance: financePanel })[view](root);
        } catch (error) { if (current === generation) notify(error.message); }
    }
    function hide() { generation++; root.hidden = true; }
    function mount() {
        document.body.classList.add('studio-admin');
        const nav = document.querySelector('#sidebar-menu nav');
        for (const [key, title] of [['sales','Sales'],['studio','Studio'],['finance','Finance']]) {
            const btn = button(title, () => open(key)); btn.id = 'nav-studio-' + key; btn.className = 'nav-item studio-nav';
            nav.insertBefore(btn, document.getElementById('nav-messages'));
        }
        for (const [id, label] of [['dashboard','Overview'],['settings','Settings']]) {
            const entry = document.getElementById('nav-' + id);
            for (const child of entry.childNodes) if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) child.textContent = ' ' + label;
        }
        for (const id of ['dashboard','studio-sales','studio-studio','projects','clients','studio-finance','settings']) nav.append(document.getElementById('nav-' + id));
        const tools = node('details', null, 'studio-tools'); tools.append(node('summary', 'Diğer araçlar'));
        for (const id of ['messages','intelligence','pricing','quotes']) tools.append(document.getElementById('nav-' + id));
        nav.append(tools);
        const settingsView = document.getElementById('view-settings');
        settingsView.prepend(button('AI Control Center', () => open('control'), true));
        const online = document.querySelector('#sidebar-menu > div:last-child > div');
        if (online) { online.replaceChildren(node('span', 'Private workspace', 'studio-metadata')); }
        // Keep legacy entries accessible as secondary tools.
        ['messages','pricing','quotes','intelligence'].forEach(id => document.getElementById('nav-' + id)?.classList.add('studio-secondary'));
    }
    mount();
    return { open, hide };
})();
