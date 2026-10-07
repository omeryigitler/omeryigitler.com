# Proje yayın kontrol paneli

Admin → Ayarlar bölümündeki **Proje Kontrol Paneli** kullanılır.

- **GitHub’dan getir / yenile**: omeryigitler hesabının public repolarını taslak olarak ekler. Private repolar alınmaz. Mevcut başlık, görsel, açıklama, yayın durumu ve sıralama korunur. GitHub repo kimliği yeniden adlandırmalarda çoğalmayı önler. Önceden elle eklediğiniz projeyi eşlemek için ilk aktarım öncesinde GitHub bağlantısını düzenleme formuna ekleyin.
- **Yayınla / yayından kaldır**: yalnızca sitenin görünürlüğünü değiştirir; GitHub reposunu etkilemez.
- **Yıldız**: ana sayfa seçimi. Taslak bir proje yıldızlı olsa bile ziyaretçiye görünmez.
- **Sıralama**: projeler sayfası ve ana sayfa vitrini bağımsızdır. Arama ve durum filtresini temizleyin, sürükleyin veya okları kullanın, **Sıralamayı kaydet** düğmesine basın. Geri al kayıtlı sırayı yeniden yükler.
- **Düzenle**: başlık, açıklama, kategori, teknolojiler, bağlantılar ve görseller. Canlı site adresi zorunlu değildir.
- **Önizle**: kaydedilmiş projenin kart özeti; tam ziyaretçi sayfasının kopyası değildir.

## Yayına geçiş

Mevcut Firestore kayıtları korunur. Yeni kayıtlar taslaktır; mevcut published alanı bulunmayan eski kayıtlar uyumluluk için görünür kalır. Otomatik örnek kayıt ekleme kaldırıldı. Ziyaretçi sayfaları artık API boş döndüğünde veya hata verdiğinde sabit örnek projeler yayınlamaz. Hiçbir featured seçimi yoksa ana sayfa vitrini gösterilmez. Public liste cache edilmez; sonraki sayfa yüklemesinde güncel seçimler alınır.

GitHub içe aktarma mevcut Firebase admin doğrulamasını kullanır, token kurulumu gerektirmez. Anonim GitHub API kota sınırına ulaşılırsa panel hata gösterir; kayıtlar değişmez. Envanter önce tamamen alınır, ardından tek Firestore işlemiyle yazılır. Bu sürümde tek aktarım/sıralama sınırı 400 projedir.

## Kontroller

`npm run quality`, `npx tsc --noEmit` ve `node --test test/portfolio-publishing.test.js`.

Yerel arayüz kontrolü örnek kayıtlar ve taklit API ile yapılır. Gerçek Firebase yazma, GitHub import ve yayınlama işlemleri üretimde çalıştırılmamıştır. Yayın öncesi Firebase yapılandırılmış preview ortamında admin girişini ve bir test kaydının kaydedilmesini doğrulayın.

## Ziyaretçi arşivi

Projeler sayfası Portfolio reposundaki editoryal arşiv düzenini siyah–altın kimliğe uyarlar: büyük başlık, kategori filtreleri, URL ile paylaşılabilir arama ve üç/iki/tek sütun proje kartları. Masaüstünde hover veya Önizle kontrolüyle görsel açılır; 680px altında görseller doğrudan görünür. Görsel yüklenmezse proje metni ve bağlantılar kullanılabilir kalır. Arşiv filtre kategorisi, açıklayıcı kategori metninden bağımsızdır ve panelde seçilir. Filtreleme adminin belirlediği sıralamayı korur.

Son arayüz kontrolü: örnek verilerle masaüstü arama, kategori, önizleme; 390px iframe içinde responsive düzen ve taşma ölçümü (390px içerik / 390px genişlik). Gerçek cihaz dokunma testi yapılmadı.
