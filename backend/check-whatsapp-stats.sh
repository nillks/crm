#!/bin/bash

# Скрипт для проверки статистики WhatsApp сообщений
# Использование: ./check-whatsapp-stats.sh [JWT_TOKEN]

BASE_URL="http://localhost:3000"
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

JWT_TOKEN=${1:-""}

echo "📊 Проверка статистики WhatsApp сообщений"
echo "=========================================="
echo ""

if [ -z "$JWT_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  JWT токен не указан${NC}"
    echo "Использование: ./check-whatsapp-stats.sh YOUR_JWT_TOKEN"
    echo ""
    echo "Для получения токена:"
    echo "  curl -X POST $BASE_URL/auth/login \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -d '{\"email\":\"admin@example.com\",\"password\":\"your_password\"}'"
    echo ""
    exit 1
fi

echo "1️⃣  Проверка endpoint /whatsapp/stats..."
echo ""

STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/whatsapp/stats" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json")

if echo "$STATS_RESPONSE" | grep -q "totalMessages"; then
    echo -e "${GREEN}✅ Endpoint работает${NC}"
    echo ""
    echo "📈 Статистика:"
    echo "$STATS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATS_RESPONSE"
else
    echo -e "${RED}❌ Ошибка при получении статистики${NC}"
    echo "Ответ: $STATS_RESPONSE"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Проверка завершена"

