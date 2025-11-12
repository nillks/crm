# CRUD API для клиентов

## Описание

Полный CRUD API для работы с клиентами с поддержкой пагинации, фильтрации, поиска и загрузки связанных данных.

## Endpoints

### 1. Создание клиента

**POST** `/clients`

**Требуется право:** `create Client`

**Тело запроса:**
```json
{
  "name": "Иван Иванов",
  "phone": "+79991234567",
  "email": "ivan@example.com",
  "telegramId": "123456789",
  "whatsappId": "79991234567",
  "instagramId": "ivan_ivanov",
  "notes": "Важный клиент",
  "status": "active"
}
```

**Ответ:** `201 Created`
```json
{
  "id": "uuid",
  "name": "Иван Иванов",
  "phone": "+79991234567",
  "email": "ivan@example.com",
  "telegramId": "123456789",
  "whatsappId": "79991234567",
  "instagramId": "ivan_ivanov",
  "notes": "Важный клиент",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 2. Получение списка клиентов

**GET** `/clients`

**Требуется право:** `read Client`

**Query параметры:**
- `page` (number, default: 1) - номер страницы
- `limit` (number, default: 10, max: 100) - количество элементов на странице
- `sortBy` (string, default: 'createdAt') - поле для сортировки: `name`, `createdAt`, `updatedAt`
- `sortOrder` (string, default: 'DESC') - направление сортировки: `ASC`, `DESC`
- `search` (string) - общий поиск по имени, телефону или email
- `name` (string) - фильтр по имени (частичное совпадение)
- `phone` (string) - фильтр по телефону (частичное совпадение)
- `email` (string) - фильтр по email (частичное совпадение)
- `status` (string) - фильтр по статусу: `active`, `inactive`, `blocked`
- `include` (string) - связанные данные через запятую: `tickets`, `messages`, `calls`

**Примеры:**

```bash
# Получить первую страницу (10 клиентов)
GET /clients?page=1&limit=10

# Поиск по имени
GET /clients?search=Иван

# Фильтр по статусу
GET /clients?status=active

# С загрузкой тикетов и сообщений
GET /clients?include=tickets,messages

# Комбинированные фильтры
GET /clients?name=Иван&status=active&page=1&limit=20&sortBy=name&sortOrder=ASC
```

**Ответ:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Иван Иванов",
      "phone": "+79991234567",
      "email": "ivan@example.com",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "tickets": [...],  // если указан include=tickets
      "messages": [...], // если указан include=messages
      "calls": [...]     // если указан include=calls
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

### 3. Получение клиента по ID

**GET** `/clients/:id`

**Требуется право:** `read Client`

**Query параметры:**
- `include` (string) - связанные данные через запятую: `tickets`, `messages`, `calls`

**Пример:**
```bash
GET /clients/uuid?include=tickets,messages,calls
```

**Ответ:** `200 OK`
```json
{
  "id": "uuid",
  "name": "Иван Иванов",
  "phone": "+79991234567",
  "email": "ivan@example.com",
  "telegramId": "123456789",
  "whatsappId": "79991234567",
  "instagramId": "ivan_ivanov",
  "notes": "Важный клиент",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "tickets": [...],  // если указан include=tickets
  "messages": [...], // если указан include=messages
  "calls": [...]     // если указан include=calls
}
```

**Ошибка:** `404 Not Found`
```json
{
  "statusCode": 404,
  "message": "Клиент с ID uuid не найден",
  "error": "Not Found"
}
```

### 4. Обновление клиента

**PUT** `/clients/:id`

**Требуется право:** `update Client`

**Тело запроса:** (все поля опциональны)
```json
{
  "name": "Иван Петров",
  "phone": "+79991234568",
  "email": "ivan.petrov@example.com",
  "status": "inactive",
  "notes": "Обновленные заметки"
}
```

**Ответ:** `200 OK`
```json
{
  "id": "uuid",
  "name": "Иван Петров",
  "phone": "+79991234568",
  "email": "ivan.petrov@example.com",
  "status": "inactive",
  "notes": "Обновленные заметки",
  "updatedAt": "2024-01-02T00:00:00.000Z"
}
```

**Ошибки:**
- `404 Not Found` - клиент не найден
- `400 Bad Request` - email или телефон уже используются другим клиентом

### 5. Удаление клиента

**DELETE** `/clients/:id`

**Требуется право:** `delete Client`

**Ответ:** `204 No Content`

**Ошибка:** `404 Not Found`
```json
{
  "statusCode": 404,
  "message": "Клиент с ID uuid не найден",
  "error": "Not Found"
}
```

## Права доступа

### Администратор
- ✅ Полный доступ ко всем операциям (manage all)

### Операторы (operator1, operator2, operator3)
- ✅ Чтение клиентов (`read Client`)
- ✅ Создание клиентов (`create Client`)
- ✅ Обновление клиентов (`update Client`)
- ✅ Удаление клиентов (`delete Client`)

## Валидация

### CreateClientDto
- `name` - обязательное, строка, максимум 100 символов
- `phone` - опциональное, строка, максимум 20 символов
- `email` - опциональное, валидный email, максимум 255 символов
- `telegramId` - опциональное, строка, максимум 50 символов
- `whatsappId` - опциональное, строка, максимум 50 символов
- `instagramId` - опциональное, строка, максимум 50 символов
- `notes` - опциональное, текст
- `status` - опциональное, одно из: `active`, `inactive`, `blocked` (по умолчанию: `active`)

### UpdateClientDto
- Все поля опциональны, те же правила валидации, что и в CreateClientDto

### FilterClientsDto
- `page` - число, минимум 1
- `limit` - число, минимум 1, максимум 100
- `sortBy` - одно из: `name`, `createdAt`, `updatedAt`
- `sortOrder` - одно из: `ASC`, `DESC`
- `status` - одно из: `active`, `inactive`, `blocked`
- `search` - строка для поиска по имени, телефону или email
- `name`, `phone`, `email` - строки для фильтрации
- `include` - строка с перечислением через запятую: `tickets`, `messages`, `calls`

## Обработка ошибок

### 400 Bad Request
- Email уже используется другим клиентом
- Телефон уже используется другим клиентом
- Некорректные данные валидации

### 401 Unauthorized
- Отсутствует или невалидный JWT токен

### 403 Forbidden
- Недостаточно прав для выполнения операции

### 404 Not Found
- Клиент с указанным ID не найден

## Примеры использования

### Создание клиента
```bash
curl -X POST http://localhost:3000/clients \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Иван Иванов",
    "phone": "+79991234567",
    "email": "ivan@example.com",
    "status": "active"
  }'
```

### Получение списка с фильтрами
```bash
curl -X GET "http://localhost:3000/clients?status=active&page=1&limit=20&sortBy=name&sortOrder=ASC" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Поиск клиентов
```bash
curl -X GET "http://localhost:3000/clients?search=Иван" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Получение клиента с связанными данными
```bash
curl -X GET "http://localhost:3000/clients/uuid?include=tickets,messages,calls" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Обновление клиента
```bash
curl -X PUT http://localhost:3000/clients/uuid \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Иван Петров",
    "status": "inactive"
  }'
```

### Удаление клиента
```bash
curl -X DELETE http://localhost:3000/clients/uuid \
  -H "Authorization: Bearer YOUR_TOKEN"
```

