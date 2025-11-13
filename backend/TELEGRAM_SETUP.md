# Настройка Telegram Bot

## Необходимые данные

Для работы Telegram бота нужен **Bot Token** от BotFather.

### Как получить Bot Token:

1. Откройте Telegram
2. Найдите бота **@BotFather**
3. Отправьте команду `/newbot`
4. Следуйте инструкциям:
   - Введите имя бота (например: "CRM Support Bot")
   - Введите username бота (например: "crm_support_bot")
5. BotFather выдаст вам токен, например:
   ```
   123456789:ABCdefGHIjklMNOpqrsTUVwxyz1234567890
   ```
6. Скопируйте этот токен

## Настройка переменных окружения

Добавьте в файл `backend/.env`:

```env
# Telegram Bot настройки
TELEGRAM_BOT_TOKEN=ваш_bot_token_от_BotFather
```

**Пример:**
```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz1234567890
```

## Проверка работы

### 1. Проверка конфигурации

```bash
# Получите JWT токен через login
TOKEN="your_jwt_token"

# Проверьте конфигурацию
curl -X GET http://localhost:3000/telegram/config \
  -H "Authorization: Bearer $TOKEN"
```

**Ожидаемый результат:**
```json
{
  "botToken": "***configured***",
  "isConfigured": true
}
```

### 2. Отправка тестового сообщения

```bash
curl -X POST http://localhost:3000/telegram/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "123456789",
    "message": "Тестовое сообщение"
  }'
```

**Важно:** 
- `chatId` - это Telegram ID пользователя (число)
- Пользователь должен сначала написать боту, чтобы бот мог ему отвечать

### 3. Проверка приёма сообщений

1. Найдите вашего бота в Telegram (по username, который вы указали)
2. Отправьте боту сообщение
3. Проверьте логи backend - должно появиться сообщение о получении
4. Проверьте БД - сообщение должно быть сохранено в таблице `messages`
5. Проверьте БД - должен быть создан/обновлён клиент в таблице `clients`
6. Проверьте БД - должен быть создан/обновлён тикет в таблице `tickets`

## Как узнать chatId пользователя

1. Пользователь должен написать боту
2. В логах backend будет выведен chatId
3. Или используйте метод `getUpdates` через Telegram API:
   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates"
   ```

## Особенности Telegram Bot

1. **Пользователь должен начать диалог первым** - бот не может инициировать диалог
2. **ChatId** - это числовой ID пользователя или группы
3. **Автоматическое создание клиентов** - при первом сообщении создаётся клиент
4. **Автоматическое создание тикетов** - для каждого нового клиента создаётся тикет

## Унифицированный формат сообщений

Все сообщения сохраняются в едином формате в таблице `messages`:
- `channel` = 'telegram'
- `direction` = 'inbound' или 'outbound'
- `content` = текст сообщения
- `externalId` = 'telegram-{message_id}'
- `clientId` = связь с клиентом
- `ticketId` = связь с тикетом (опционально)

## Обработка ошибок

- Rate limits (429) - автоматическая обработка с понятным сообщением
- Неверный chatId - возвращается ошибка 404
- Бот не инициализирован - возвращается ошибка 400

## Полезные ссылки

- [BotFather](https://t.me/BotFather)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegraf Documentation](https://telegraf.js.org/)

