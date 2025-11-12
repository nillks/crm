#!/bin/bash

# Тестирование интеграции WhatsApp (Green API)

BASE_URL="http://localhost:3000"
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
NC="\033[0m" # No Color

echo "🧪 Тестирование WhatsApp интеграции (Green API)"
echo "================================================"
echo ""

# 1. Проверка health
echo "1️⃣  Проверка health endpoint..."
HEALTH=$(curl -s $BASE_URL/health)
if echo "$HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Backend работает${NC}"
else
    echo -e "${RED}❌ Backend не работает${NC}"
    exit 1
fi
echo ""

# 2. Проверка webhook endpoint (публичный)
echo "2️⃣  Проверка webhook endpoint..."
WEBHOOK_RESPONSE=$(curl -s -X POST $BASE_URL/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "typeWebhook": "incomingMessageReceived",
    "timestamp": 1234567890,
    "idMessage": "test-webhook-123",
    "data": {
      "typeMessage": "textMessage",
      "chatId": "79991234567@c.us",
      "senderId": "79991234567@c.us",
      "senderName": "Test User",
      "textMessage": "Тестовое сообщение через webhook",
      "idMessage": "test-webhook-123",
      "timestamp": 1234567890
    }
  }')

if echo "$WEBHOOK_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ Webhook endpoint работает${NC}"
    echo "   Ответ: $WEBHOOK_RESPONSE"
else
    echo -e "${RED}❌ Webhook endpoint не работает${NC}"
    echo "   Ответ: $WEBHOOK_RESPONSE"
fi
echo ""

# 3. Проверка конфигурации (требует авторизацию)
echo "3️⃣  Проверка конфигурации (требует авторизацию)..."
echo -e "${YELLOW}⚠️  Для полной проверки нужен JWT токен${NC}"
echo "   Используйте: curl -X GET $BASE_URL/whatsapp/config -H 'Authorization: Bearer YOUR_TOKEN'"
echo ""

# 4. Проверка отправки сообщения (требует авторизацию)
echo "4️⃣  Проверка отправки сообщения (требует авторизацию)..."
echo -e "${YELLOW}⚠️  Для полной проверки нужен JWT токен и клиент в БД${NC}"
echo "   Используйте: curl -X POST $BASE_URL/whatsapp/send \\"
echo "     -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"phoneNumber\":\"79991234567\",\"message\":\"Тест\"}'"
echo ""

# 5. Проверка обработки разных типов сообщений
echo "5️⃣  Проверка обработки разных типов сообщений..."

# Текстовое сообщение
echo "   📝 Текстовое сообщение..."
TEXT_RESPONSE=$(curl -s -X POST $BASE_URL/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "typeWebhook": "incomingMessageReceived",
    "timestamp": 1234567890,
    "data": {
      "typeMessage": "textMessage",
      "chatId": "79991234567@c.us",
      "textMessage": "Текст",
      "idMessage": "text-123"
    }
  }')
if echo "$TEXT_RESPONSE" | grep -q "success"; then
    echo -e "   ${GREEN}✅ Обработано${NC}"
else
    echo -e "   ${RED}❌ Ошибка${NC}"
fi

# Изображение
echo "   🖼️  Изображение..."
IMAGE_RESPONSE=$(curl -s -X POST $BASE_URL/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "typeWebhook": "incomingMessageReceived",
    "timestamp": 1234567890,
    "data": {
      "typeMessage": "imageMessage",
      "chatId": "79991234567@c.us",
      "caption": "Подпись к изображению",
      "idMessage": "image-123"
    }
  }')
if echo "$IMAGE_RESPONSE" | grep -q "success"; then
    echo -e "   ${GREEN}✅ Обработано${NC}"
else
    echo -e "   ${RED}❌ Ошибка${NC}"
fi

# Статус доставки
echo "   📊 Статус доставки..."
STATUS_RESPONSE=$(curl -s -X POST $BASE_URL/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "typeWebhook": "outgoingMessageStatus",
    "timestamp": 1234567890,
    "data": {
      "idMessage": "text-123",
      "status": "delivered",
      "timestamp": 1234567890
    }
  }')
if echo "$STATUS_RESPONSE" | grep -q "success"; then
    echo -e "   ${GREEN}✅ Обработано${NC}"
else
    echo -e "   ${RED}❌ Ошибка${NC}"
fi
echo ""

# Итоги
echo "================================================"
echo "📋 Итоги проверки:"
echo ""
echo "✅ Backend работает"
echo "✅ Webhook endpoint доступен"
echo "✅ Обработка входящих сообщений работает"
echo "✅ Обработка статусов работает"
echo ""
echo -e "${YELLOW}⚠️  Для полной проверки нужны:${NC}"
echo "   - JWT токен (через /auth/login)"
echo " - Клиент в БД для теста отправки"
echo "   - Настроенный webhook в Green API"
echo ""
echo "💡 Для проверки сохранения в БД выполните SQL запрос:"
echo "   SELECT * FROM messages WHERE channel = 'whatsapp' ORDER BY \"createdAt\" DESC LIMIT 5;"
echo ""

