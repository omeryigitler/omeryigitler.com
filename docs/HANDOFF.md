# Handoff

## Aktif çalışma

- Branch: `agent/complete-operational-agent`
- Taban: `main`
- Yayın akışı: draft PR, Preview doğrulaması, insan onayı, manuel merge

## Tamamlanan Agent kapsamı

- Admin paneli artık `assets/js/admin-agent.js` dosyasını gerçekten yüklüyor.
- Agent son lead, bugünkü/okunmamış mesajlar, aktif projeler ve son ziyaretçileri özetliyor.
- Okuma sonuçları, komutlar, araç çağrıları ve hatalar Firestore audit/run kayıtlarına yazılıyor.
- Son 10 Agent çalıştırması admin modalında gösteriliyor.
- Son lead üzerinden teklif taslağı yalnız açık onaydan sonra transaction içinde oluşturuluyor.
- `FREEZE`, `CLEAR`, `ALARM` ve `BLOCK` ziyaretçi komutları admin ve Telegram'da doğrudan çalışmıyor; yüksek riskli onay kaydı oluşturuyor.
- Telegram metin komutları deterministik Agent yönlendiricisine bağlandı.
- Telegram ses girdisi Gemini ile yalnız sınıflandırılıyor/transkribe ediliyor; yazma yetkisini model belirlemiyor.
- Telegram approve/reject düğmeleri aynı Firestore onay transaction'ını kullanıyor.
- Telegram dış çağrılarına timeout ve ses dosyasına boyut sınırı eklendi.
- Telegram webhook secret doğrulaması timing-safe ve fail-closed hale getirildi.
- Eski `elitebody` istemci kodundaki commitlenmiş Gemini anahtarı kaldırıldı.
- Operasyon ve deployment yönergeleri `docs/AGENT_OPERATIONS.md` içine yazıldı.

## Merge öncesi manuel güvenlik koşulları

- Vercel Preview ve Production için `TELEGRAM_WEBHOOK_SECRET` tanımlanmalı; aynı değer Telegram webhook `secret_token` olarak ayarlanmalı.
- Git geçmişinde kalan eski Gemini API anahtarı Google tarafında iptal edilmeli.
- Preview ortamı için ayrı Firebase projesi/service account sağlanmalı; Production private key Preview'a kopyalanmamalı.
- İzole Preview'da okuma komutları ile teklif/ziyaretçi onaylarının en az birer reject smoke testi yapılmalı.

## Doğrulama

- `npm run quality`: başarılı.
- Testler: 31/31 başarılı.
- Production build: başarılı.
- `git diff --check`: başarılı.
- Secret pattern taraması: yeni/aktif secret bulunmadı; eski Gemini key koddan kaldırıldı.
- Yerel tarayıcı DOM testi: Agent launcher tek kez mount oldu, dialog açıldı, hızlı komutlar, bekleyen onaylar ve son 10 çalıştırma bölgeleri erişilebilir.

## Veri ve risk etkisi

- Yeni migration yok; Firestore şeması esnek.
- Okuma araçları ham ziyaretçi IP adresini Agent çıktısına eklemiyor.
- Teklif ve ziyaretçi yazımları onay transaction'ı olmadan yürümüyor.
- Kod doğrudan `main`e gönderilmemeli; manuel merge zorunlu.
