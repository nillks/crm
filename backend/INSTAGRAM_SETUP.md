# Настройка Instagram интеграции

## ⚠️ Важно: Нет простых альтернатив (как Green API для WhatsApp)

В отличие от WhatsApp, для Instagram **нет** таких же простых сторонних сервисов:
- Instagram API полностью контролируется Meta
- Нет аналогов Green API для Instagram
- Все сторонние сервисы работают через тот же Instagram Graph API

**Поэтому:** Используйте мок-режим для разработки, а для продакшена потребуется Instagram Graph API.

## Необходимые данные

### Вариант 1: Мок-режим (РЕКОМЕНДУЕТСЯ для разработки)

**Ничего не нужно!** Просто добавьте в `.env`:
```env
INSTAGRAM_USE_MOCK=true
```

В мок-режиме:
- ✅ Сообщения сохраняются в БД
- ✅ Можно тестировать через webhook
- ✅ Не требует регистрации в Meta
- ✅ Работает локально

### Вариант 2: Реальный Instagram Graph API

Если нужен реальный API (требует Meta аккаунт):

1. Создайте Facebook App на https://developers.facebook.com/
2. Добавьте продукт "Instagram"
3. Подключите Instagram Business Account
4. Получите Access Token и Page ID

**Добавьте в `.env`:**
```env
INSTAGRAM_USE_MOCK=false
INSTAGRAM_API_URL=https://graph.instagram.com/v18.0
INSTAGRAM_ACCESS_TOKEN=your_access_token
INSTAGRAM_PAGE_ID=your_page_id
```

## Настройка (мок-режим)

Добавьте в `backend/.env`:
```env
INSTAGRAM_USE_MOCK=true
```

Готово! Можно тестировать.

## Проверка работы

### 1. Тест webhook (мок-режим)

```bash
curl -X POST http://localhost:3000/instagram/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "senderId": "123456789",
    "messageId": "test-123",
    "text": "Тестовое сообщение из Instagram",
    "username": "test_user"
  }'
```

**Ожидаемый результат:**
```json
{
  "success": true
}
```

### 2. Проверка конфигурации

```bash
# Получите JWT токен
TOKEN="your_jwt_token"

curl -X GET http://localhost:3000/instagram/config \
  -H "Authorization: Bearer $TOKEN"
```

**Ожидаемый результат (мок-режим):**
```json
{
  "apiUrl": "https://graph.instagram.com/v18.0",
  "pageId": "not set",
  "accessToken": "not set",
  "useMockMode": true,
  "isConfigured": true
}
```

### 3. Отправка сообщения (мок-режим)

```bash
curl -X POST http://localhost:3000/instagram/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "123456789",
    "message": "Тестовое сообщение"
  }'
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "messageId": "mock-1234567890",
  "recipientId": "123456789",
  "message": { ... },
  "mock": true
}
```

## Проверка в БД

После тестирования проверьте:
```sql
SELECT * FROM messages WHERE channel = 'instagram' ORDER BY "createdAt" DESC LIMIT 5;
SELECT * FROM clients WHERE "instagramId" IS NOT NULL;
SELECT * FROM tickets WHERE channel = 'instagram';
```

## Формат данных

Все сообщения сохраняются в едином формате:
- `channel` = 'instagram'
- `direction` = 'inbound' или 'outbound'
- `content` = текст сообщения
- `externalId` = 'instagram-{messageId}'
- `clientId` = связь с клиентом
- `ticketId` = связь с тикетом

## Преимущества мок-режима

1. **Не требует регистрации** - работает сразу
2. **Бесплатно** - никаких ограничений
3. **Полный функционал** - все операции работают
4. **Тестирование** - можно тестировать весь flow
5. **Разработка** - можно разрабатывать без внешних зависимостей

## Переход на реальный API

Когда будете готовы использовать реальный Instagram API:
1. Получите credentials от Meta
2. Измените `INSTAGRAM_USE_MOCK=false` в `.env`
3. Добавьте `INSTAGRAM_ACCESS_TOKEN` и `INSTAGRAM_PAGE_ID`
4. Перезапустите сервер

Код автоматически переключится на реальный API.

