# Альтернативы Instagram Graph API

## Проблема с Instagram Graph API

Instagram Graph API от Meta требует:
- Facebook Business Account
- Instagram Business Account
- Верификацию бизнеса
- Сложную регистрацию (как и WhatsApp)

## Решения

### 1. Мок-режим (РЕКОМЕНДУЕТСЯ для разработки) ⭐

**Плюсы:**
- ✅ Полностью бесплатный
- ✅ Не требует регистрации
- ✅ Полный контроль
- ✅ Можно тестировать локально
- ✅ Сообщения сохраняются в БД

**Минусы:**
- ❌ Не работает с реальными сообщениями
- ❌ Только для разработки

**Как использовать:**
Добавьте в `.env`:
```env
INSTAGRAM_USE_MOCK=true
```

В этом режиме:
- Webhook принимает любые данные (можно тестировать через POST запросы)
- Сообщения сохраняются в БД
- Отправка сообщений сохраняется в БД (но не отправляется в Instagram)

### 2. Instagram Graph API (для продакшена)

Если всё же нужно использовать реальный API:

1. Создайте Facebook App
2. Добавьте Instagram продукт
3. Подключите Instagram Business Account
4. Получите Access Token и Page ID

**Переменные окружения:**
```env
INSTAGRAM_USE_MOCK=false
INSTAGRAM_API_URL=https://graph.instagram.com/v18.0
INSTAGRAM_ACCESS_TOKEN=your_access_token
INSTAGRAM_PAGE_ID=your_page_id
```

### 3. Chatrace API (РЕКОМЕНДУЕТСЯ для продакшена) ⭐

**Chatrace** - сторонний сервис, который предоставляет API для Instagram Direct сообщений, аналогично Green API для WhatsApp.

**Плюсы:**
- ✅ Проще, чем Instagram Graph API
- ✅ Не требует сложной верификации Meta
- ✅ Работает с реальными сообщениями
- ✅ Упрощённая интеграция

**Минусы:**
- ❌ Платный сервис (но проще, чем Meta)
- ❌ Зависимость от стороннего сервиса

**Настройка:**
1. Получите Access Token от Chatrace
2. Добавьте в `.env`:
   ```env
   INSTAGRAM_USE_MOCK=false
   INSTAGRAM_USE_CHATRACE=true
   INSTAGRAM_API_URL=https://api.chatrace.com
   INSTAGRAM_ACCESS_TOKEN=your_chatrace_token
   ```
3. Настройте webhook в Chatrace на `/instagram/webhook`

**Подробная инструкция:** См. `CHATRACE_SETUP.md`

---

### 4. Другие сторонние сервисы

#### A. Instagram Basic Display API
- ✅ Проще регистрация, чем Graph API
- ❌ Не поддерживает Direct сообщения
- ❌ Только для чтения данных профиля

#### B. Другие платформы
- **ManyChat** - платный, но простая настройка
- **Chatfuel** - платный, но удобный интерфейс
- **Socialbakers** - корпоративный, дорогой

#### C. Автоматизация через Instagram Web (не рекомендуется)
- Использование неофициальных библиотек
- ❌ Нарушение ToS Instagram
- ❌ Риск блокировки аккаунта
- ❌ Нестабильно

## Рекомендация

**Для разработки:** Используйте мок-режим
- Быстро
- Бесплатно
- Можно тестировать весь функционал
- Сообщения сохраняются в БД

**Для продакшена:** Используйте **Chatrace API** (аналог Green API для WhatsApp)
- ✅ Проще, чем Instagram Graph API
- ✅ Не требует сложной верификации Meta
- ✅ Работает с реальными сообщениями
- ✅ Упрощённая интеграция

**Альтернатива для продакшена:** Instagram Graph API (если Chatrace не подходит)
- Требует верификацию бизнеса
- Сложная настройка
- Но это официальный способ от Meta

## Настройка мок-режима

Добавьте в `backend/.env`:
```env
INSTAGRAM_USE_MOCK=true
```

Теперь можно тестировать через webhook:
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

Сообщение будет сохранено в БД с каналом `instagram`.

