#!/bin/bash

# Скрипт для тестирования webhook Chatrace

echo "=========================================="
echo "Тестирование Instagram Webhook (Chatrace)"
echo "=========================================="
echo ""

# URL webhook
WEBHOOK_URL="http://localhost:3000/instagram/webhook"

echo "1. Тест 1: Простой формат (прямые поля)"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "senderId": "123456789",
    "messageId": "test-msg-1",
    "text": "Тестовое сообщение 1",
    "username": "test_user",
    "timestamp": 1731499200
  }'
echo -e "\n"

echo "2. Тест 2: Вложенная структура (Instagram Graph API формат)"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "id": "entry-1",
      "time": 1731499200,
      "messaging": [{
        "sender": {"id": "123456789"},
        "recipient": {"id": "987654321"},
        "timestamp": 1731499200,
        "message": {
          "mid": "test-msg-2",
          "text": "Тестовое сообщение 2"
        }
      }]
    }]
  }'
echo -e "\n"

echo "3. Тест 3: Массив сообщений"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "senderId": "111111111",
      "messageId": "test-msg-3-1",
      "text": "Сообщение 1 из массива",
      "username": "user1"
    },
    {
      "senderId": "222222222",
      "messageId": "test-msg-3-2",
      "text": "Сообщение 2 из массива",
      "username": "user2"
    }
  ]'
echo -e "\n"

echo "4. Тест 4: Формат с sender и message"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "sender": {
      "id": "123456789",
      "username": "test_user"
    },
    "message": {
      "id": "test-msg-4",
      "text": "Тестовое сообщение 4",
      "timestamp": 1731499200
    }
  }'
echo -e "\n"

echo "=========================================="
echo "Тестирование завершено"
echo "Проверьте логи бэкенда для результатов"
echo "=========================================="

