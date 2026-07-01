# Handoff

## Aktif çalışma

- Branch: `agent/agent-preview-fix`
- Draft PR: `#14 feat(agent): secure approval workflow and contact recovery`
- Taban: `main`

## Tamamlananlar

- Contact formundaki Turnstile yüklenme/boş token çelişkisi giderildi.
- Contact API yapılandırılmış hata kodları, hostname/action kontrolü, timeout ve hashlenmiş transaction tabanlı rate limit kullanıyor.
- Yeni mesajlar hem `createdAt` hem `timestamp` ile kaydediliyor; Agent iki alanı da geriye uyumlu okuyor.
- Agent API Instagram fonksiyonundan ayrıldı ve ortam eksikse güvenli `503` veriyor.
- Instagram API Graph pagination URL'larını dışarı döndürmüyor; access token public yanıttan çıkarıldı.
- Contact API Firebase Admin'i lazy-load ediyor; Preview eksik credential durumunda ham function crash yerine güvenli `503` veriyor.
- Turnstile doğrulaması beklenen `contact` action veya izinli hostname eksikse fail-closed davranıyor.
- Admin yetkisi revocation kontrolü ve açık allowlist/claim ile doğrulanıyor; genel Firebase kullanıcı bypass'ı kaldırıldı.
- Komut ve onay girdileri sınırlandırıldı; onay yürütme tek Firestore transaction'ında idempotent hale getirildi.
- Onaylanan teklif, sonradan değişebilen kaynak mesaj yerine operatöre gösterilen fiyat/kapsam snapshot'ından oluşturuluyor.
- Fiyat hesabı `config/pricing.json` içindeki sürümlü kurallara taşındı.
- Yinelenen add-on değerleri tek kaleme indiriliyor; API body ve dış servis çağrıları sınırlı/timeout kontrollü.
- Admin Agent modalının yüklenme sırası, odak/escape davranışı ve kullanıcı metinleri düzeltildi.
- Çalışmayan anonim Edge blocklist sorgusu `EDGE_BLOCKLIST_ENABLED` feature flag arkasına alındı; IP loglama kaldırıldı.
- Node built-in test paketi ve `npm run quality` eklendi.

## Sıradaki iş

- Meta tarafında açığa çıkmış Instagram access token'ını rotate et.
- İzole Preview Firebase projesi tanımlandığında Agent'ın gerçek Firestore yazma/onay smoke testini çalıştır.
- Bu iki güvenlik koşulu tamamlandıktan ve insan onayı alındıktan sonra PR'ı main'e merge edip production smoke test yap.

## Engeller / açık kararlar

- `EDGE_BLOCKLIST_ENABLED` varsayılan olarak kapalıdır. Hashlenmiş ve kimliği doğrulanmış Edge blocklist veri kaynağı ayrı tasarım kararıdır.
- Preview'da production Firebase service account anahtarı kullanılmamalıdır. Tam Agent entegrasyon testi için izole Preview Firebase projesi gerekir.
- Canlı Instagram access token'ı önceki public pagination yanıtında açığa çıktığı için main geçişinden önce Meta tarafında rotate edilmelidir.
- Production dependency ağacında branch öncesinden gelen `3 critical / 25 high` npm audit bulgusu vardır; bu değişiklik dependency eklemez.
- `docs/MVP_PLAN.md` ve `docs/DECISIONS.md` henüz repoda yoktur.

## Son doğrulama

- `npm run quality`: başarılı.
- Testler: 23/23 başarılı.
- `git diff --check`: başarılı.
- Canlı hata kanıtı: 2026-07-01 08:50:12 `/api/contact` isteği `403` döndü; istemcide Turnstile yüklenmemişti.
- Tarayıcı: Turnstile başarısızken boş token gönderilmiyor ve anlaşılır güvenlik durumu gösteriliyor.
- Tarayıcı: Admin Agent launcher ve erişilebilir dialog tek kez mount oluyor.

## Veri / güvenlik etkisi

- Migration yok; Firestore şeması esnektir.
- Agent `agent_commands`, `agent_runs`, `agent_approvals`, `agent_audit_logs`, `quotes`, `clients` ve `messages` koleksiyonlarını kullanır.
- Kritik onay yazımları atomik; kaynak mesajda mevcut teklif varsa ikinci teklif engellenir.
- Approval preview e-posta adresini maskeler; secret veya token loglanmaz.
