#!/bin/bash

echo "🧪 Тестирование Groq API"
echo ""

# Проверяем доступность backend
echo "0. Проверяю доступность backend..."
if ! curl -s --connect-timeout 2 http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "   ❌ Backend не отвечает на порту 3000"
  echo "   Проверьте, что backend запущен"
  exit 1
fi
echo "   ✅ Backend доступен"

# Получаем роль
echo ""
echo "1. Получаю роль..."
ROLES_RESPONSE=$(curl -s http://localhost:3000/api/roles 2>&1)
if [ $? -ne 0 ] || [ -z "$ROLES_RESPONSE" ]; then
  echo "   ❌ Не удалось получить роли"
  exit 1
fi
ROLE_ID=$(echo "$ROLES_RESPONSE" | jq -r '.[0].id // empty' 2>/dev/null)
if [ -z "$ROLE_ID" ] || [ "$ROLE_ID" == "null" ]; then
  echo "   ❌ Не удалось извлечь ID роли"
  echo "   Ответ: $ROLES_RESPONSE"
  exit 1
fi
echo "   Роль ID: $ROLE_ID"

# Регистрируем пользователя
echo ""
echo "2. Регистрирую тестового пользователя..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test_ai_$(date +%s)@test.com\",\"password\":\"test123\",\"name\":\"Test User\",\"roleId\":\"$ROLE_ID\"}")

TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.accessToken')
if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "   ❌ Ошибка регистрации"
  exit 1
fi
echo "   ✅ Токен получен"

# Тест ChatGPT endpoint
echo ""
echo "3. Тестирую ChatGPT endpoint..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/ai/chatgpt/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"Привет! Как дела?"}')

MODEL=$(echo "$RESPONSE" | jq -r '.model')
TOKENS=$(echo "$RESPONSE" | jq -r '.tokensUsed')
RESPONSE_TEXT=$(echo "$RESPONSE" | jq -r '.response')

echo "   Модель: $MODEL"
echo "   Токенов: $TOKENS"
echo "   Ответ: ${RESPONSE_TEXT:0:150}..."

if [ "$MODEL" != "mock" ] && [ "$TOKENS" -gt 0 ] 2>/dev/null; then
  echo ""
  echo "   ✅✅✅ GROQ API РАБОТАЕТ! ✅✅✅"
  echo "   Это реальный ответ от Groq!"
else
  echo ""
  echo "   ⚠️ Mock режим активен"
  echo "   Проверьте логи backend на 'Groq AI клиент инициализирован'"
fi

# Тест статистики
echo ""
echo "4. Проверяю статистику..."
STATS=$(curl -s -X GET "http://localhost:3000/api/ai/stats" \
  -H "Authorization: Bearer $TOKEN")
echo "$STATS" | jq '.'

echo ""
echo "✅ Тестирование завершено!"

