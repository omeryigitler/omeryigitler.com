#!/bin/bash
# Taurus Tracker - Yeni Sayfa Oluşturma Scripti
# Kullanım: ./create-page.sh yeni-sayfa-adi "Sayfa Başlığı" "Açıklama"

# Renk kodları
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

if [ -z "$1" ]; then
    echo -e "${RED}❌ Hata: Sayfa adı belirtilmedi!${NC}"
    echo "Kullanım: ./create-page.sh sayfa-adi \"Başlık\" \"Açıklama\""
    echo "Örnek: ./create-page.sh about \"Hakkımda\" \"Ömer Yiğitler hakkında bilgi\""
    exit 1
fi

PAGE_NAME="$1"
PAGE_TITLE="${2:-New Page | Ömer Yiğitler}"
PAGE_DESC="${3:-Your page description here}"

# Dosya adını oluştur
FILE_NAME="${PAGE_NAME}.html"
TEMPLATE="_TEMPLATE_new_page.html"

# Template var mı kontrol et
if [ ! -f "$TEMPLATE" ]; then
    echo -e "${RED}❌ Hata: Template dosyası bulunamadı: $TEMPLATE${NC}"
    exit 1
fi

# Dosya zaten var mı kontrol et
if [ -f "$FILE_NAME" ]; then
    echo -e "${RED}❌ Hata: $FILE_NAME zaten mevcut!${NC}"
    exit 1
fi

echo -e "${BLUE}📄 Yeni sayfa oluşturuluyor: $FILE_NAME${NC}"

# Template'i kopyala
cp "$TEMPLATE" "$FILE_NAME"

# Placeholder'ları değiştir (macOS ve Linux uyumlu)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|<title>New Page | Ömer Yiğitler</title>|<title>$PAGE_TITLE</title>|g" "$FILE_NAME"
    sed -i '' "s|Your page description here|$PAGE_DESC|g" "$FILE_NAME"
    sed -i '' "s|your-page.html|$FILE_NAME|g" "$FILE_NAME"
    sed -i '' "s|Your Page Title|$PAGE_TITLE|g" "$FILE_NAME"
else
    # Linux
    sed -i "s|<title>New Page | Ömer Yiğitler</title>|<title>$PAGE_TITLE</title>|g" "$FILE_NAME"
    sed -i "s|Your page description here|$PAGE_DESC|g" "$FILE_NAME"
    sed -i "s|your-page.html|$FILE_NAME|g" "$FILE_NAME"
    sed -i "s|Your Page Title|$PAGE_TITLE|g" "$FILE_NAME"
fi

echo -e "${GREEN}✅ Sayfa başarıyla oluşturuldu: $FILE_NAME${NC}"
echo -e "${GREEN}🔒 Taurus Tracker otomatik olarak eklendi${NC}"
echo ""
echo -e "${BLUE}📝 Sonraki adımlar:${NC}"
echo "   1. $FILE_NAME dosyasını açın"
echo "   2. İçeriği düzenleyin (<!-- YOUR CONTENT HERE --> bölümünü doldurun)"
echo "   3. Git'e ekleyin: git add $FILE_NAME"
echo "   4. Commit yapın: git commit -m \"Add: $PAGE_TITLE\""
echo "   5. Push edin: git push origin main"
echo ""
echo -e "${GREEN}🎯 Alarm, Block ve Freeze komutları otomatik olarak aktif!${NC}"
