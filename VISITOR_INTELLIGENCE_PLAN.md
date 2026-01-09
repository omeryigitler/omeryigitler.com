# 🕵️‍♂️ Taurus Insight: Ziyaretçi İstihbarat Sistemi - Proje Planı

**Proje Sahibi:** Ömer Yiğitler
**Kapsam:** omeryigitler.com (Ana Portfolyo)
**Durum:** Tasarım Aşamasında

---

## 1. Proje Özeti
Bu proje, `omeryigitler.com` ziyaretçilerini yalnızca bir sayı olarak değil, birer "kimlik" (persona) olarak analiz etmeyi amaçlar. Admin panelinize eklenecek "Intelligence" modülü ile ziyaretçilerinizi anlık izleyebileceksiniz.

---

## 2. Teknik Mimari (Nasıl Çalışacak?)

Sistem 3 ana ayaktan oluşur:

### A. Ajan Yazılım (`tracker.js`) 📡
Sitenin tüm sayfalarına (`index.html`, `projects.html`) eklenecek hafif bir JavaScript dosyası.
*   Ziyaretçi girdiği an çalışır.
*   Sessizce teknik verileri toplar.
*   Admin veritabanına (Firebase) raporlar.

### B. Veri Tabanı (Firestore) 💾
Veriler mevcut Firebase projeniz içinde güvenle saklanır.
*   **Koleksiyon:** `visitors`
*   **Saklanan Veri:** IP, Lokasyon, Cihaz, Tarayıcı, Referans Kaynağı.

### C. Komuta Merkezi (Admin Paneli) 🖥️
Mevcut Dashboard'a yeni bir sekme eklenir.

---

## 3. Özellik Seti (Onayınıza Sunulan Modüller)

Aşağıdaki özelliklerden hangilerini aktif edelim? Onayınıza göre geliştirmeyi başlatacağım.

### ✅ Modül 1: Kimlik Tespiti (IP Intelligence)
Ziyaretçinin internet bağlantısı üzerinden kimliğini çıkarır.
*   **Konum:** Ülke, Şehir (Örn: Beşiktaş, İstanbul).
*   **Bağlantı:** İnternet Sağlayıcı (Örn: Turkcell Superonline, Türk Telekom).
*   **Kurumsal:** Eğer bir şirketten bağlanıyorsa Şirket Adı.

### ✅ Modül 2: Cihaz ve Ortam Analizi
Ziyaretçinin donanım detayları.
*   **Cihaz:** iPhone 15 Pro, Samsung S24, Macbook Air vb.
*   **Tarayıcı:** Chrome, Safari, Instagram Tarayıcısı (In-App).
*   **Ekran:** Çözünürlük bilgisi.

### ✅ Modül 3: Dijital Ayak İzi (Oturum İzleme)
Kullanıcının site içindeki yolculuğu.
*   **Ref:** Siteye nereden geldi? (Google, LinkedIn, Direkt, QR Kod).
*   **Akış:** Hangi sayfaları gezdi?
*   **Zaman:** Sitede ne kadar kaldı?

### ✅ Modül 4: Canlı Radar (Real-Time)
Admin panelinde o an sitede olanları işaretler.

---

## 4. Admin Paneli Tasarımı
Panelde "SYSTEM" sekmesinin yanına yeni bir **"INTELLIGENCE"** sekmesi eklenecek.

**Görünüm:**
*   **Üst Kartlar:** Toplam Ziyaretçi, En Çok Girilen Şehir, Mobil/Masaüstü Oranı.
*   **Canlı Tablo:** Ziyaretçilerin bayrakları, şehirleri ve cihaz ikonlarıyla listelendiği şık bir tablo.
*   **Detay Penceresi:** Tabloya tıklayınca o kişinin tüm geçmişini gösteren kart.

---

## 5. Gizlilik ve Yasal Notlar ⚖️
*   **KVKK:** IP adresleri işlendiği için "Gizlilik Politikası" metnini güncellemeniz önerilir.
*   **Maskeleme:** İsterseniz admin panelinde IP adreslerinin son hanesini gizleyebiliriz (Örn: 88.241.xxx).

---

## 🚀 Başlangıç Talimatı
Onayınız durumunda şu adımlarla ilerleyeceğim:
1.  **Frontend:** `tracker.js` yazılarak siteye eklenecek.
2.  **Dashboard:** `admin.html` güncellenerek yeni "Visitors" sekmesi eklenecek.
3.  **Deploy:** Tüm değişiklikler GitHub'a gönderilecek.
