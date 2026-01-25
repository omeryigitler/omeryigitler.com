#!/bin/bash

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Deploy Süreci Başlatılıyor: VERCEL HOSTING${NC}"
echo "------------------------------------------------"

# 1. Pricing Tool Build
echo -e "${YELLOW}📦 Adım 1: Pricing Tool Derleniyor...${NC}"
cd pricing-tool
if npm run build; then
    echo -e "${GREEN}✅ Pricing Tool derlendi.${NC}"
else
    echo -e "${RED}❌ Hata: Pricing Tool derlenemedi!${NC}"
    exit 1
fi
cd ..

# 2. Ana CSS Build
echo -e "${YELLOW}🎨 Adım 2: Ana Site CSS Derleniyor...${NC}"
if npm run build:css; then
    echo -e "${GREEN}✅ CSS derlendi.${NC}"
else
    echo -e "${RED}❌ Hata: CSS derlenemedi!${NC}"
    exit 1
fi

# 3. Vercel Deploy
echo -e "${YELLOW}☁️  Adım 3: Vercel'e Yükleniyor...${NC}"
# --prod bayrağı canlı siteye (omeryigitler.com) atar
if npx vercel deploy --prod --yes; then
    echo "------------------------------------------------"
    echo -e "${GREEN}✅ BAŞARILI! Site yayında: https://omeryigitler.com${NC}"
else
    echo -e "${RED}❌ Hata: Vercel deploy başarısız oldu.${NC}"
    exit 1
fi
