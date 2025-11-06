# ERD - Схема базы данных CRM

## Диаграмма связей (Entity Relationship Diagram)

```
┌─────────────────┐
│     roles       │
├─────────────────┤
│ id (PK)         │
│ name (UNIQUE)   │
│ description     │
│ createdAt       │
│ updatedAt       │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐
│     users       │
├─────────────────┤
│ id (PK)         │
│ name            │
│ email (UNIQUE)  │
│ password        │
│ roleId (FK) ────┼───► roles
│ phone           │
│ status          │
│ lastLoginAt     │
│ createdAt       │
│ updatedAt       │
└─────┬───┬───────┘
      │   │
      │   │ 1:N
      │   │
      │   └──────────────────────────────────────────┐
      │                                               │
      │ 1:N                                           │ 1:N
      │                                               │
┌─────▼──────────┐                          ┌────────▼────────┐
│    tickets     │                          │     calls      │
├────────────────┤                          ├────────────────┤
│ id (PK)        │                          │ id (PK)        │
│ title           │                          │ type           │
│ description     │                          │ status         │
│ clientId (FK)───┼───► clients             │ phoneNumber    │
│ createdById────┼───► users (createdBy)   │ clientId (FK)──┼───► clients
│ assignedToId───┼───► users (assignedTo)  │ operatorId─────┼───► users
│ status          │                          │ externalId     │
│ channel         │                          │ duration       │
│ priority        │                          │ startedAt      │
│ dueDate         │                          │ endedAt        │
│ closedAt        │                          │ createdAt      │
│ createdAt       │                          └────────┬───────┘
│ updatedAt       │                                   │
└─────┬───┬───────┘                                   │ 1:N
      │   │                                           │
      │   │ 1:N                                       │
      │   │                                           │
      │   └──────────────────┐              ┌─────────▼─────────┐
      │                      │              │   call_logs       │
      │                      │              ├───────────────────┤
      │ 1:N                  │ 1:N         │ id (PK)           │
      │                      │              │ callId (FK) ──────┼───► calls
      │                      │              │ recordingUrl      │
      │                      │              │ transcription     │
      │                      │              │ metadata (jsonb)  │
      │                      │              │ createdAt         │
      │                      │              └───────────────────┘
      │                      │
┌─────▼──────────┐  ┌────────▼──────────┐
│   comments      │  │ transfer_history  │
├────────────────┤  ├───────────────────┤
│ id (PK)        │  │ id (PK)          │
│ content         │  │ ticketId (FK) ───┼───► tickets
│ ticketId (FK)───┼──┼─► tickets        │ ticketId (FK)
│ userId (FK)────┼──┼──► users          │ fromUserId (FK) ────► users (fromUser)
│ isInternal      │  │ toUserId (FK) ───┼───► users (toUser)
│ createdAt       │  │ reason           │
│ updatedAt       │  │ createdAt        │
└────────────────┘  └───────────────────┘

┌─────────────────┐
│    clients      │
├─────────────────┤
│ id (PK)         │
│ name            │
│ phone           │
│ email           │
│ telegramId      │
│ whatsappId      │
│ instagramId     │
│ notes           │
│ status          │
│ createdAt       │
│ updatedAt       │
└─────┬───┬───┬───┘
      │   │   │
      │   │   │ 1:N
      │   │   │
      │   │   └──────────────────┐
      │   │                      │
      │   │ 1:N                  │ 1:N
      │   │                      │
┌─────▼───▼───────┐      ┌────────▼──────────┐
│   messages      │      │   media_files     │
├─────────────────┤      ├───────────────────┤
│ id (PK)         │      │ id (PK)           │
│ channel         │      │ fileName          │
│ direction       │      │ mimeType          │
│ content         │      │ type              │
│ externalId      │      │ size              │
│ clientId (FK)───┼──────┼──► clients        │
│ ticketId (FK)───┼───► tickets             │ clientId (FK)
│ isRead          │      │ messageId (FK) ───┼───► messages
│ isDelivered     │      │ url               │
│ deliveredAt     │      │ thumbnailUrl     │
│ createdAt       │      │ externalId        │
└─────────────────┘      │ createdAt         │
                         └───────────────────┘

┌─────────────────┐
│     users       │
├─────────────────┤
│ ...             │
└─────┬───────────┘
      │
      │ 1:N
      │
┌─────▼───────────┐
│     tasks       │
├─────────────────┤
│ id (PK)         │
│ title           │
│ description     │
│ clientId (FK)───┼───► clients
│ assignedToId───┼───► users
│ status          │
│ priority        │
│ category        │
│ dueDate         │
│ completedAt     │
│ createdAt       │
│ updatedAt       │
└─────────────────┘

┌─────────────────┐
│    clients      │
├─────────────────┤
│ ...             │
└─────┬───────────┘
      │
      │ 1:N
      │
┌─────▼───────────┐
│  ai_settings    │
├─────────────────┤
│ id (PK)         │
│ clientId (FK)───┼───► clients
│ isEnabled       │
│ provider        │
│ model           │
│ systemPrompt    │
│ temperature     │
│ maxTokens       │
│ tokensUsed      │
│ settings (jsonb)│
│ createdAt       │
│ updatedAt       │
└─────────────────┘

┌─────────────────┐
│  quick_replies  │
├─────────────────┤
│ id (PK)         │
│ title           │
│ content         │
│ channel         │
│ category        │
│ isActive        │
│ usageCount      │
│ createdAt       │
│ updatedAt       │
└─────────────────┘
(Нет связей - самостоятельная таблица)
```

## Описание таблиц

### Основные таблицы

#### 1. **roles** - Роли пользователей
- Связь: `1:N` с `users`
- Роли: admin, operator1, operator2, operator3

#### 2. **users** - Пользователи (операторы, администраторы)
- Связи:
  - `N:1` с `roles`
  - `1:N` с `tickets` (createdBy, assignedTo)
  - `1:N` с `comments`
  - `1:N` с `tasks`
  - `1:N` с `transfer_history` (fromUser, toUser)
  - `1:N` с `calls`

#### 3. **clients** - Клиенты
- Связи:
  - `1:N` с `tickets`
  - `1:N` с `messages`
  - `1:N` с `calls`
  - `1:N` с `tasks`
  - `1:N` с `media_files`
  - `1:N` с `ai_settings`

#### 4. **tickets** - Тикеты/билеты
- Связи:
  - `N:1` с `clients`
  - `N:1` с `users` (createdBy)
  - `N:1` с `users` (assignedTo)
  - `1:N` с `comments`
  - `1:N` с `messages`
  - `1:N` с `transfer_history`
- Статусы: new, in_progress, closed, overdue
- Каналы: whatsapp, telegram, instagram, call

#### 5. **messages** - Сообщения
- Связи:
  - `N:1` с `clients`
  - `N:1` с `tickets`
  - `1:N` с `media_files`
- Каналы: whatsapp, telegram, instagram
- Направление: inbound, outbound

#### 6. **calls** - Звонки
- Связи:
  - `N:1` с `clients`
  - `N:1` с `users` (operator)
  - `1:N` с `call_logs`
- Типы: inbound, outbound
- Статусы: ringing, answered, missed, completed, failed

#### 7. **call_logs** - Записи звонков
- Связи:
  - `N:1` с `calls`
- Содержит: URL записи, транскрипцию, метаданные

#### 8. **tasks** - Задачи/тапсырмалар
- Связи:
  - `N:1` с `clients`
  - `N:1` с `users` (assignedTo)
- Статусы: pending, in_progress, completed, cancelled, overdue
- Приоритеты: 1-5 (low, medium, high, urgent, critical)

#### 9. **comments** - Комментарии к тикетам
- Связи:
  - `N:1` с `tickets`
  - `N:1` с `users`
- Поле `isInternal` - внутренний комментарий (не виден клиенту)

#### 10. **transfer_history** - История передач между операторами
- Связи:
  - `N:1` с `tickets`
  - `N:1` с `users` (fromUser)
  - `N:1` с `users` (toUser)
- Логирует передачу тикета от одного оператора другому

#### 11. **quick_replies** - Быстрые ответы/шаблоны
- Нет связей (самостоятельная таблица)
- Каналы: whatsapp, telegram, instagram, all

#### 12. **media_files** - Медиа-файлы
- Связи:
  - `N:1` с `clients`
  - `N:1` с `messages`
- Типы: image, pdf, doc, docx, audio, video, other

#### 13. **ai_settings** - Настройки AI-агента
- Связи:
  - `N:1` с `clients`
- Провайдеры: openai, yandex_gpt
- Содержит настройки модели, промпты, лимиты токенов

## Индексы

### Основные индексы для производительности:

1. **users**: email (unique), roleId, status
2. **clients**: phone, email, status, createdAt
3. **tickets**: status, channel, clientId, assignedToId, createdAt, updatedAt
4. **messages**: clientId, ticketId, channel, direction, createdAt
5. **calls**: clientId, operatorId, status, type, createdAt
6. **tasks**: clientId, assignedToId, status, priority, dueDate, createdAt
7. **comments**: ticketId, userId, createdAt
8. **transfer_history**: ticketId, fromUserId, toUserId, createdAt
9. **media_files**: clientId, messageId, type, createdAt
10. **ai_settings**: clientId, isEnabled

## Типы данных

- **UUID** - для всех первичных ключей
- **VARCHAR** - для строковых полей с ограничением длины
- **TEXT** - для длинных текстовых полей
- **TIMESTAMP** - для дат и времени
- **BOOLEAN** - для логических значений
- **INTEGER/BIGINT** - для числовых значений
- **JSONB** - для метаданных и настроек (PostgreSQL)

## Связи (Relationships)

### One-to-Many (1:N)
- roles → users
- users → tickets (createdBy, assignedTo)
- users → comments
- users → tasks
- users → calls
- users → transfer_history (fromUser, toUser)
- clients → tickets
- clients → messages
- clients → calls
- clients → tasks
- clients → media_files
- clients → ai_settings
- tickets → comments
- tickets → messages
- tickets → transfer_history
- calls → call_logs
- messages → media_files

### Many-to-One (N:1)
- Все связи выше в обратном направлении

## Примечания

- Все таблицы используют UUID для первичных ключей
- Все связи используют внешние ключи (Foreign Keys) с каскадными ограничениями
- Timestamps (createdAt, updatedAt) автоматически обновляются
- Индексы созданы для часто используемых полей для оптимизации запросов
- JSONB используется для хранения метаданных и настроек

