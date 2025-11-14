#!/bin/bash

# Скрипт для тестирования Chatrace API

TOKEN="1543616.9NzKE301G8dmBBDxnJtACY1YXnDXFJ2HF"
BASE_URL="https://api.chatrace.com"

echo "=========================================="
echo "Тестирование Chatrace API для Instagram"
echo "=========================================="
echo ""

echo "1. Тест: GET /messages/receive (Bearer)"
echo "----------------------------------------"
curl -s -X GET "${BASE_URL}/messages/receive" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  2>&1 | head -15
echo ""

echo "2. Тест: GET /messages/receive (X-API-Key)"
echo "----------------------------------------"
curl -s -X GET "${BASE_URL}/messages/receive" \
  -H "X-API-Key: ${TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  2>&1 | head -15
echo ""

echo "3. Тест: GET /messages/get (Bearer)"
echo "----------------------------------------"
curl -s -X GET "${BASE_URL}/messages/get" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  2>&1 | head -15
echo ""

echo "4. Тест: GET /instagram/messages (Bearer)"
echo "----------------------------------------"
curl -s -X GET "${BASE_URL}/instagram/messages" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  2>&1 | head -15
echo ""

echo "5. Тест: GET /api/messages?token=... (Query param)"
echo "----------------------------------------"
curl -s -X GET "${BASE_URL}/api/messages?token=${TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  2>&1 | head -15
echo ""

echo "6. Тест: POST /webhook/receive (Bearer)"
echo "----------------------------------------"
curl -s -X POST "${BASE_URL}/webhook/receive" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\nHTTP Status: %{http_code}\n" \
  2>&1 | head -15
echo ""

echo "=========================================="
echo "Тестирование завершено"
echo "=========================================="
echo ""
echo "Если все запросы возвращают 404 или 401,"
echo "значит Chatrace использует только webhooks"
echo "или требует другую настройку."

