# 📋 Yeni Sayfa Ekleme Kılavuzu

Taurus Tracker güvenlik sistemi artık her yeni sayfaya **otomatik olarak** eklenecek şekilde yapılandırıldı.

## 🚀 Hızlı Kullanım

### Yöntem 1: Otomatik Script (Önerilen)

Terminal'de projenin ana klasöründe:

```bash
./create-page.sh sayfa-adi "Sayfa Başlığı" "SEO Açıklaması"
```

**Örnek:**
```bash
./create-page.sh about "Hakkımda" "Ömer Yiğitler - Profesyonel Web Geliştirici"
./create-page.sh services "Hizmetlerim" "Web tasarım ve geliştirme hizmetleri"
./create-page.sh blog "Blog" "Teknoloji ve yazılım hakkında yazılar"
```

Script otomatik olarak:
- ✅ Yeni HTML dosyasını oluşturur
- ✅ Taurus Tracker'ı ekler
- ✅ Firebase entegrasyonunu yapar
- ✅ SEO meta taglerini doldurur
- ✅ Logo ve favicon'ları ekler

### Yöntem 2: Manuel Kopyalama

1. `_TEMPLATE_new_page.html` dosyasını kopyalayın
2. Yeni adla kaydedin (örn: `about.html`)
3. İçeriği düzenleyin

```bash
cp _TEMPLATE_new_page.html yeni-sayfa.html
```

## 🔒 Güvenlik Garantisi

Her iki yöntemde de aşağıdaki güvenlik sistemleri **otomatik olarak aktif** olur:

- 🚨 **ALARM Modu:** Telegram'dan anlık uyarı gönderme
- ⛔ **BLOCK Modu:** Kullanıcıyı tamamen engelleme
- ❄️ **FREEZE Modu:** Sayfayı dondurma ve özel mesaj gösterme
- 📊 **Live Tracking:** Gerçek zamanlı kullanıcı takibi
- 📝 **Event Logging:** Tüm hareketlerin kaydı
- 🚪 **Exit Reports:** Sayfa çıkışında detaylı rapor

## 📁 Dosya Yapısı

Yeni sayfa oluşturulduğunda şu yapı otomatik eklenir:

```html
<!-- TAURUS SECURITY SYSTEM (DO NOT REMOVE) -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js"></script>
<script src="assets/js/firebase-config.js"></script>

<script src="assets/js/tracker/logo_data.js"></script>
<script src="assets/js/tracker/taurus-tracker.js?v=V35"></script>
```

⚠️ **ÖNEMLİ:** Bu script bloğunu **asla silmeyin veya düzenlemeyin**. Tüm güvenlik sisteminiz buna bağlı.

## 🎯 İçerik Düzenleme

Template'de `<!-- YOUR CONTENT HERE -->` yazan bölümü düzenleyin:

```html
<main class="min-h-screen pt-20 pb-16">
    <div class="container mx-auto px-6">
        <!-- Buraya kendi içeriğinizi ekleyin -->
        <h1 class="font-display text-4xl font-bold text-white mb-8">Başlık</h1>
        <p class="text-gray-400">İçerik...</p>
    </div>
</main>
```

## 🌐 Alt Klasörlerde Sayfa Oluşturma

Eğer `/blog/post.html` gibi alt klasörde sayfa oluşturuyorsanız:

1. Script yollarını düzeltin:
```html
<script src="../assets/js/firebase-config.js"></script>
<script src="../assets/js/tracker/taurus-tracker.js?v=V35"></script>
```

2. CSS ve asset path'lerini de güncelleyin:
```html
<link href="../assets/css/styles.css?v=V10" rel="stylesheet">
```

## ✅ Test Checklist

Yeni sayfa oluşturduktan sonra:

1. [ ] Sayfayı tarayıcıda açın
2. [ ] Console'da `🐂 Taurus Tracker v5.5` mesajını görün
3. [ ] Telegram'da "Neural Link Established" bildirimi gelsin
4. [ ] Admin panelde "Visitors" altında session görünsün
5. [ ] Telegram'dan ALARM komutu gönderin ve test edin

## 📦 Deployment

```bash
git add yeni-sayfa.html
git commit -m "Add: Yeni Sayfa Başlığı"
git push origin main
```

Vercel otomatik deploy edecek ve tracker anında aktif olacak.

---

**Not:** Template dosyasını (`_TEMPLATE_new_page.html`) ve script'i (`create-page.sh`) asla silmeyin. Bunlar gelecekte yeni sayfa eklerken gerekli olacak.
