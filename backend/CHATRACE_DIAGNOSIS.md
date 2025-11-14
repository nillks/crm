# Диагностика Chatrace API для Instagram

## Результаты тестирования

### Тест 1: Polling (GET запросы)

**Все тесты возвращают 401 "No valid API key provided":**

- ❌ `GET /messages/receive` (Bearer) → 401
- ❌ `GET /messages/receive` (X-API-Key) → 401
- ❌ `GET /messages/get` (Bearer) → 401
- ❌ `GET /instagram/messages` (Bearer) → 401
- ❌ `GET /api/messages?token=...` (Query param) → 401
- ❌ `POST /webhook/receive` (Bearer) → 401

**Вывод:** Chatrace **НЕ поддерживает polling** для получения сообщений через стандартные GET endpoints.

### Тест 2: Формат токена

Токен: `1543616.9NzKE301G8dmBBDxnJtACY1YXnDXFJ2HF`

**Возможные варианты:**
- Это может быть не API ключ, а **Account ID + Token**
- Формат: `{accountId}.{token}`
- Возможно, нужно использовать только часть токена

### Тест 3: Webhook

Webhook endpoint работает (протестирован вручную):
```bash
curl -X POST http://localhost:3000/instagram/webhook \
  -H "Content-Type: application/json" \
  -d '{"senderId":"test123","text":"Тест"}'
```
✅ Возвращает `{"success":true}`

## Выводы

### ✅ Подтверждено:

1. **Chatrace НЕ поддерживает polling**
   - Все GET endpoints возвращают 401
   - Нет стандартного способа запросить сообщения через API

2. **Chatrace использует ТОЛЬКО webhooks**
   - Сообщения приходят через POST запросы на ваш сервер
   - Нужно настроить webhook URL в личном кабинете Chatrace

3. **Токен может быть в неправильном формате**
   - Все запросы возвращают 401
   - Возможно, нужен другой формат авторизации
   - Или токен используется только для отправки сообщений, а не для получения

## Решение

### Шаг 1: Настройте Webhook в Chatrace

**Это ОБЯЗАТЕЛЬНО!** Без webhook сообщения не будут приходить.

1. Войдите в https://chatrace.com/en/settings?acc=1543616
2. Найдите раздел "Webhooks" или "API Settings" или "Integrations"
3. Добавьте webhook URL:
   - **Локально (с ngrok):** `https://your-ngrok-url.ngrok.io/instagram/webhook`
   - **Production:** `https://your-domain.com/instagram/webhook`
4. Убедитесь, что webhook **активирован**
5. Выберите события: **"Instagram messages"** или **"Incoming messages"**

### Шаг 2: Проверьте формат токена

Токен `1543616.9NzKE301G8dmBBDxnJtACY1YXnDXFJ2HF` может быть:
- Account ID: `1543616`
- Token: `9NzKE301G8dmBBDxnJtACY1YXnDXFJ2HF`

**Попробуйте использовать только вторую часть:**
```env
INSTAGRAM_ACCESS_TOKEN=9NzKE301G8dmBBDxnJtACY1YXnDXFJ2HF
```

Или проверьте в личном кабинете Chatrace, какой формат токена правильный.

### Шаг 3: Проверьте документацию Chatrace

Если в личном кабинете есть документация API:
- Проверьте формат авторизации
- Проверьте правильные endpoints
- Проверьте, нужен ли webhook для получения сообщений

### Шаг 4: Обратитесь в поддержку Chatrace

Если ничего не помогает:
- Email: support@chatrace.com (если доступен)
- Через личный кабинет: https://chatrace.com/en/settings?acc=1543616
- Уточните:
  - Как получить сообщения из Instagram?
  - Какой формат токена правильный?
  - Как настроить webhook?
  - Поддерживается ли polling?

## Текущий статус

- ✅ Webhook endpoint работает (`/instagram/webhook`)
- ✅ Обработка webhook'ов реализована
- ✅ Polling реализован (но не работает - Chatrace не поддерживает)
- ❌ Polling не работает (401 на все запросы)
- ❓ Webhook не настроен в Chatrace (нужно проверить)

## Следующие шаги

1. **Настройте webhook в Chatrace** - это главное!
2. Отправьте тестовое сообщение в Instagram
3. Проверьте логи бэкенда - должен появиться webhook
4. Если webhook не приходит - проверьте настройки в Chatrace

