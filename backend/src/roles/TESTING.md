# Тестирование системы RBAC

## Критерии выполнения задачи 6

### ✅ 1. Можно создать пользователя с определённой ролью

**Проверка:**
```bash
# Регистрация пользователя с ролью admin
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Администратор",
    "email": "admin@test.com",
    "password": "password123",
    "roleId": "7c7667c1-cf55-4bdf-9c5b-c0b1f3b775d3"
  }'

# Регистрация пользователя с ролью operator1
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Оператор 1",
    "email": "operator1@test.com",
    "password": "password123",
    "roleId": "9328ddb4-668c-45be-88c4-8d7524c089c9"
  }'
```

**Ожидаемый результат:**
- Пользователь успешно создается
- В ответе возвращается информация о роли пользователя
- Роль корректно сохраняется в базе данных

### ✅ 2. Guards корректно проверяют права доступа

**Проверка через тестовый контроллер:**

#### Тест 1: Доступ только для администратора
```bash
# Вход как администратор
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123"
  }'

# Получаем accessToken из ответа, затем:
curl -X GET http://localhost:3000/test-permissions/admin-only \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Ожидаемый результат:**
- ✅ Администратор получает доступ (200 OK)
- ❌ Оператор получает 403 Forbidden

#### Тест 2: Доступ только для операторов
```bash
# Вход как оператор
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operator1@test.com",
    "password": "password123"
  }'

# Получаем accessToken из ответа, затем:
curl -X GET http://localhost:3000/test-permissions/operator-only \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Ожидаемый результат:**
- ✅ Оператор получает доступ (200 OK)
- ❌ Администратор получает доступ (200 OK) - так как операторы тоже могут получить доступ

#### Тест 3: Проверка прав через @RequirePermissions
```bash
# Проверка права на чтение клиентов (доступно операторам)
curl -X GET http://localhost:3000/test-permissions/read-clients \
  -H "Authorization: Bearer OPERATOR_TOKEN"

# Проверка права на управление пользователями (только админ)
curl -X GET http://localhost:3000/test-permissions/manage-users \
  -H "Authorization: Bearer OPERATOR_TOKEN"
```

**Ожидаемый результат:**
- ✅ Оператор может читать клиентов (200 OK)
- ❌ Оператор НЕ может управлять пользователями (403 Forbidden)
- ✅ Администратор может управлять пользователями (200 OK)

### ✅ 3. Недопустимый доступ возвращает 403 ошибку

**Проверка:**

#### Тест 1: Оператор пытается получить доступ к админскому endpoint
```bash
curl -X GET http://localhost:3000/test-permissions/admin-only \
  -H "Authorization: Bearer OPERATOR_TOKEN"
```

**Ожидаемый результат:**
```json
{
  "statusCode": 403,
  "message": "Недостаточно прав. Требуемая роль: admin",
  "error": "Forbidden"
}
```

#### Тест 2: Оператор пытается получить доступ к управлению пользователями
```bash
curl -X GET http://localhost:3000/test-permissions/manage-users \
  -H "Authorization: Bearer OPERATOR_TOKEN"
```

**Ожидаемый результат:**
```json
{
  "statusCode": 403,
  "message": "Недостаточно прав. Требуется: manage User",
  "error": "Forbidden"
}
```

### ✅ 4. Роли корректно применяются к пользователям

**Проверка:**

#### Тест 1: Проверка роли текущего пользователя
```bash
curl -X GET http://localhost:3000/test-permissions/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Ожидаемый результат:**
```json
{
  "user": {
    "id": "...",
    "name": "Оператор 1",
    "email": "operator1@test.com",
    "role": {
      "id": "9328ddb4-668c-45be-88c4-8d7524c089c9",
      "name": "operator1",
      "description": "Оператор линии №1"
    }
  }
}
```

#### Тест 2: Проверка через /auth/me
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Ожидаемый результат:**
- Роль корректно возвращается в ответе
- Роль загружается из базы данных при каждом запросе

## Полный сценарий тестирования

### Шаг 1: Создание seed данных
```bash
cd backend
npm run seed:roles
```

### Шаг 2: Регистрация пользователей с разными ролями
```bash
# Администратор
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Администратор",
    "email": "admin@test.com",
    "password": "password123",
    "roleId": "7c7667c1-cf55-4bdf-9c5b-c0b1f3b775d3"
  }'

# Оператор 1
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Оператор 1",
    "email": "operator1@test.com",
    "password": "password123",
    "roleId": "9328ddb4-668c-45be-88c4-8d7524c089c9"
  }'
```

### Шаг 3: Вход и получение токенов
```bash
# Вход администратора
ADMIN_RESPONSE=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123"
  }')

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | jq -r '.accessToken')

# Вход оператора
OPERATOR_RESPONSE=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operator1@test.com",
    "password": "password123"
  }')

OPERATOR_TOKEN=$(echo $OPERATOR_RESPONSE | jq -r '.accessToken')
```

### Шаг 4: Тестирование прав доступа

```bash
# Администратор может получить доступ к админскому endpoint
curl -X GET http://localhost:3000/test-permissions/admin-only \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Оператор НЕ может получить доступ к админскому endpoint
curl -X GET http://localhost:3000/test-permissions/admin-only \
  -H "Authorization: Bearer $OPERATOR_TOKEN"

# Оператор может читать клиентов
curl -X GET http://localhost:3000/test-permissions/read-clients \
  -H "Authorization: Bearer $OPERATOR_TOKEN"

# Оператор НЕ может управлять пользователями
curl -X GET http://localhost:3000/test-permissions/manage-users \
  -H "Authorization: Bearer $OPERATOR_TOKEN"

# Администратор может управлять пользователями
curl -X GET http://localhost:3000/test-permissions/manage-users \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Структура прав доступа

### Администратор (admin)
- ✅ Полный доступ ко всем ресурсам (manage all)

### Операторы (operator1, operator2, operator3)
- ✅ Чтение: Client, Ticket, Message, Call, Task, Comment, QuickReply, MediaFile
- ✅ Создание: Client, Ticket, Message, Call, Task, Comment
- ✅ Обновление: Client, Ticket, Message, Task
- ✅ Удаление: Comment (только свои)
- ❌ Управление: User, Role, AiSetting, Settings

## Использование в контроллерах

### Пример 1: Только для администраторов
```typescript
@Get('admin-only')
@Roles(RoleName.ADMIN)
@UseGuards(RolesGuard)
adminOnly() {
  // Только администратор может получить доступ
}
```

### Пример 2: Для операторов
```typescript
@Get('operator-only')
@Roles(RoleName.OPERATOR1, RoleName.OPERATOR2, RoleName.OPERATOR3)
@UseGuards(RolesGuard)
operatorOnly() {
  // Любой оператор может получить доступ
}
```

### Пример 3: Проверка конкретного права
```typescript
@Get('clients')
@RequirePermissions({ action: Action.Read, subject: Subject.Client })
@UseGuards(PermissionsGuard)
getClients() {
  // Пользователь должен иметь право на чтение клиентов
}
```

### Пример 4: Комбинация роли и права
```typescript
@Get('manage-users')
@Roles(RoleName.ADMIN)
@RequirePermissions({ action: Action.Manage, subject: Subject.User })
@UseGuards(RolesGuard, PermissionsGuard)
manageUsers() {
  // Только администратор с правом управления пользователями
}
```

