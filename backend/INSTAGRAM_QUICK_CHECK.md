# Быстрая проверка Instagram

## Проблема: Сообщения из Instagram не видны

### Шаг 1: Проверьте логи бэкенда

После перезапуска сервера должны появиться логи:

```
Instagram Service initialized (CHATRACE API)
Chatrace API configured
🔧 InstagramService onModuleInit called
📡 Starting Instagram message polling (Chatrace)...
✅ Starting Instagram message polling (checking every 10 seconds)
```

**Если этих логов нет:**
- Проверьте `.env` файл
- Убедитесь, что `INSTAGRAM_USE_CHATRACE=true` (или не установлено, по умолчанию true)
- Убедитесь, что `INSTAGRAM_USE_MOCK=false` (или не установлено)
- Убедитесь, что `INSTAGRAM_ACCESS_TOKEN` установлен

### Шаг 2: Проверьте статистику

После перезапуска сервера выполните (требуется авторизация):

```bash
# Получите JWT токен
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  | jq -r '.accessToken')

# Проверьте статистику Instagram
curl -X GET http://localhost:3000/instagram/stats \
  -H "Authorization: Bearer $TOKEN"
```

**Ожидаемый результат:**
```json
{
  "totalMessages": 0,
  "inboundMessages": 0,
  "outboundMessages": 0,
  "clientsWithInstagram": 0,
  "pollingActive": true,
  "config": {
    "useChatrace": true,
    "useMockMode": false,
    "hasAccessToken": true,
    "apiUrl": "https://api.chatrace.com"
  }
}
```

### Шаг 3: Проверьте, приходят ли webhook'и

Отправьте тестовый webhook:

```bash
curl -X POST http://localhost:3000/instagram/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "senderId": "test123",
    "messageId": "test-msg-1",
    "text": "Тестовое сообщение",
    "username": "test_user",
    "timestamp": 1731499200
  }'
```

**Проверьте логи бэкенда** - должно появиться:
```
📨 Received webhook from Instagram/Chatrace
📦 Full body: { ... }
🔄 Processing Chatrace webhook: { ... }
✅ Chatrace Instagram message processed: ...
```

**Проверьте статистику снова** - `totalMessages` должен увеличиться.

### Шаг 4: Проверьте настройки Chatrace

**ВАЖНО:** Chatrace, скорее всего, **не поддерживает polling** и использует только **webhooks**.

1. Войдите в https://chatrace.com/en/settings?acc=1543616
2. Найдите раздел "Webhooks" или "API Settings"
3. Добавьте webhook URL:
   - Локально (с ngrok): `https://your-ngrok-url.ngrok.io/instagram/webhook`
   - Production: `https://your-domain.com/instagram/webhook`
4. Убедитесь, что webhook активирован
5. Выберите события: "Instagram messages"

### Шаг 5: Отправьте реальное сообщение

1. Отправьте сообщение в Instagram на аккаунт, подключенный к Chatrace
2. Проверьте логи бэкенда - должен появиться webhook
3. Проверьте статистику - сообщение должно появиться

### Если ничего не работает

1. **Проверьте логи polling:**
   - Должны быть логи каждые 10 секунд: `🔍 Checking for new Instagram messages: ...`
   - Если все endpoints возвращают 404/401 - это нормально, Chatrace использует только webhooks

2. **Проверьте webhook:**
   - Убедитесь, что webhook настроен в Chatrace
   - Убедитесь, что сервер доступен извне (для локальной разработки используйте ngrok)

3. **Обратитесь в поддержку Chatrace:**
   - Уточните формат webhook'ов
   - Уточните, поддерживается ли polling
   - Уточните правильный формат авторизации

