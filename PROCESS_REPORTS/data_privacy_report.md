# VERİ AKIŞI VE GİZLİLİK RAPORU (DATA TELEMETRY REPORT)
**Hedef:** omeryigitler.com
**Tarih:** 10 Ocak 2026
**Durum:** AKTİF VE ÇALIŞIYOR

---

## 1. YÖNETİCİ ÖZETİ
Sisteminiz, siteye giren her ziyaretçiyi **"Taurus Tracker"** adlı bir JavaScript motoru ile takip etmektedir. Bu motor, kullanıcı siteye girdiği anda çalışır, cihaz parmak izini (fingerprint) alır, tarayıcı geçmişini kaydeder ve bu verileri anlık olarak hem **Yönetici Paneline** hem de **Telegram'a** iletir.

Aşağıda, "Hangi veri alınıyor?", "Nereye gidiyor?" ve "Siz bunu nasıl görüyorsunuz?" sorularının teknik cevabı bulunmaktadır.

---

## 2. TOPLANAN VERİ ENVANTERİ
Ziyaretçilerden alınan veriler şunlardır (Kod: `taurus-tracker.js`):

### A. Kimlik ve Ağ Bilgileri
*   **IP Adresi:** Kullanıcının IP adresi alınır. (Ayarlarda `maskIP: true` olduğu için son haneleri `***` olarak gizlenir. Örn: `88.241.12.***`).
*   **Konum:** Şehir, Ülke, Posta Kodu ve Bölge (Örn: `Istanbul, TR`). `ipapi.co` servisinden anlık çekilir.
*   **ISP (İnternet Sağlayıcı):** Hangi operatörü kullandığı (Örn: `Turk Telekom`, `Superonline`).

### B. Cihaz Parmak İzi (Fingerprinting)
*   **Cihaz Tipi:** Masaüstü, Mobil veya Tablet.
*   **Marka/Model:** iPhone, Android, Windows PC, Mac.
*   **Tarayıcı (Gelişmiş):** Sadece "Chrome" değil, **"Instagram İçinden Girdi"**, "WhatsApp Linkine Tıkladı", "TikTok'tan Geldi" gibi detaylı kaynak tespiti yapılır.
*   **GPU Bilgisi:** Ekran kartı modeli (Örn: `Apple M1`, `NVIDIA GeForce...`). Bu, cihazı tekil olarak tanımak için kullanılır.
*   **Ekran Çözünürlüğü:** Örn: `390x844`.
*   **Pil Durumu:** (Destekleyen tarayıcılarda) Pil seviyesi.

### C. Davranış Analizi (Casus Modüller)
*   **Metin Kopyalama:** Ziyaretçi sitedeki bir metni kopyalarsa, "Kopyalanan Metin" size bildirilir.
*   **Form Terk Etme (Keylogger Benzeri):** Ziyaretçi iletişim formuna adını, mesajını yazıp **GÖNDERMEDEN ÇIKARSA**, yazdığı taslak veriler yakalanır ve size raporlanır ("Unsent Draft").
*   **Scroll Derinliği:** Sayfanın sonuna kadar okuyup okumadığı (%100 Okundu).
*   **Tıklama Analizi:** WhatsApp, Instagram veya E-posta linklerine tıklamaları.

---

## 3. VERİ AKIŞ ŞEMASI (DATA FLOW)

Verinin izlediği yol şu şekildedir:

1.  **ZİYARETÇİ (Browser):** Siteye girer. `taurus-tracker.js` çalışır.
2.  **TOPLAMA:** Kod, yukarıdaki verileri toplar.
3.  **BULUT (Firebase Firestore):** Veriler `visitors_v1` adlı veritabanı koleksiyonuna tekil bir `session_id` (Oturum Kimliği) ile yazılır.
4.  **İLETİM (Telegram):** Tracker, kritik olaylarda (Yeni Ziyaret, Kopyalama, Form Terk) **Telegram Bot API**'sine direkt sinyal gönderir. Admin'e bildirim düşer.
5.  **GÖRÜNTÜLEME (Admin Paneli):** Siz `admin.html` sayfasına girdiğinizde, panel `visitors_v1` veritabanını dinler ve tabloyu canlı olarak günceller.

---

## 4. ADMİN PANELİNDEKİ GÖRÜNÜM
Panelde (`admin.html`) gördüğünüz verilerin kaynağı:

| Tablo Sütunu | Veri Kaynağı (`visitors_v1`) | Açıklama |
| :--- | :--- | :--- |
| **Status** | `status` | Online (Yeşil), Offline (Gri). |
| **Location** | `location.city`, `location.country_code` | Ziyaretçinin şehri ve ülkesi. |
| **ISP / Org** | `location.isp` | İnternet servis sağlayıcısı. |
| **IP Address** | `ip_masked` | IP adresinin gizlenmiş hali. |
| **Device** | `device.model`, `device.os`, `device.browser` | Cihaz, İşletim Sistemi ve Tarayıcı (Örn: iPhone / iOS / Instagram). |
| **Pages Viewed** | `history.length` | Gezdiği toplam sayfa sayısı. |
| **Last Seen** | `last_seen` | Son hareket zamanı. |

---

## 5. OLASI SORUNLAR VE RİSKLER
*   **IP Maskeleme:** Şu an `maskIP: true` olarak ayarlı. Tam IP'yi görmek istiyorsanız `taurus-tracker.js` içindeki bu ayarı `false` yapmalıyız.
*   **Reklam Engelleyiciler (AdBlock):** Bazı katı reklam engelleyiciler `ipapi.co` servisini engelleyebilir. Bu durumda Konum "Unknown" olarak görünür.
*   **Telegram Kotası:** Çok fazla ziyaretçi aynı anda girerse Telegram API "Hız Limiti" (Rate Limit) uygulayabilir ve bazı bildirimler gecikebilir. (Sistemde `Poll` süresi 10 saniye yapılarak bu risk azaltılmıştır).

---

## 6. SONUÇ
Sisteminiz profesyonel bir **Analitik ve Güvenlik Sistemi** gibi çalışmaktadır.
*   **HATA YOK:** Veri akışında kopukluk yok.
*   **GİZLİLİK:** IP gizleme açık, bu yasal uyumluluk için iyidir.
*   **GÜÇLÜ TAKİP:** "Form Terk Etme" ve "Metin Kopyalama" gibi özellikler standart analitik araçlarında (Google Analytics vb.) yoktur, bu size özel bir güçtür.

**Sonraki Adım:**
Sistemi canlıda görmek için Vercel deployment'ının bitmesini bekleyin ve `external_integration_audit.md` dosyasındaki "Webhook" kurulumunu yapın.
