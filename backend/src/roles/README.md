# Система ролей и прав доступа (RBAC)

## Описание

Система управления ролями и правами доступа на основе CASL (Isomorphic authorization library).

## Роли

- **admin** - Администратор/директор (полный доступ ко всем ресурсам)
- **operator1** - Оператор линии №1
- **operator2** - Оператор линии №2
- **operator3** - Оператор линии №3

## Права доступа

### Администратор (admin)
- Полный доступ ко всем ресурсам (`manage all`)

### Операторы (operator1, operator2, operator3)
- **Чтение**: Клиенты, Тикеты, Сообщения, Звонки, Задачи, Комментарии, Быстрые ответы, Медиа файлы
- **Создание**: Клиенты, Тикеты, Сообщения, Звонки, Задачи, Комментарии
- **Обновление**: Клиенты, Тикеты, Сообщения, Задачи
- **Удаление**: Только свои комментарии
- **Запрещено**: Управление пользователями, ролями, настройками AI, системными настройками

## Использование

### Декоратор @Roles

Проверяет, что пользователь имеет одну из указанных ролей:

```typescript
import { Controller, Get } from '@nestjs/common';
import { Roles } from './roles/decorators/roles.decorator';
import { RoleName } from './entities/role.entity';
import { UseGuards } from '@nestjs/common';
import { RolesGuard } from './roles/guards/roles.guard';

@Controller('example')
@UseGuards(RolesGuard)
export class ExampleController {
  @Get('admin-only')
  @Roles(RoleName.ADMIN)
  adminOnly() {
    return { message: 'Только для администраторов' };
  }

  @Get('operators')
  @Roles(RoleName.OPERATOR1, RoleName.OPERATOR2, RoleName.OPERATOR3)
  operatorsOnly() {
    return { message: 'Для операторов' };
  }
}
```

### Декоратор @RequirePermissions

Проверяет конкретные права доступа:

```typescript
import { Controller, Get } from '@nestjs/common';
import { RequirePermissions } from './roles/decorators/require-permissions.decorator';
import { UseGuards } from '@nestjs/common';
import { PermissionsGuard } from './roles/guards/permissions.guard';
import { Action, Subject } from './roles/abilities.definition';

@Controller('example')
@UseGuards(PermissionsGuard)
export class ExampleController {
  @Get('read-clients')
  @RequirePermissions({ action: Action.Read, subject: Subject.Client })
  readClients() {
    return { message: 'Доступ к чтению клиентов' };
  }

  @Get('manage-users')
  @RequirePermissions({ action: Action.Manage, subject: Subject.User })
  manageUsers() {
    return { message: 'Доступ к управлению пользователями' };
  }
}
```

### Комбинирование Guards

Можно использовать оба guard одновременно:

```typescript
@Controller('example')
@UseGuards(RolesGuard, PermissionsGuard)
export class ExampleController {
  @Get('complex')
  @Roles(RoleName.ADMIN)
  @RequirePermissions({ action: Action.Read, subject: Subject.Client })
  complexCheck() {
    return { message: 'Проверка и роли, и прав' };
  }
}
```

## Доступные действия (Action)

- `Manage` - полное управление ресурсом
- `Create` - создание
- `Read` - чтение
- `Update` - обновление
- `Delete` - удаление

## Доступные ресурсы (Subject)

- `All` - все ресурсы
- `User` - пользователи
- `Client` - клиенты
- `Ticket` - тикеты
- `Message` - сообщения
- `Call` - звонки
- `Task` - задачи
- `Comment` - комментарии
- `QuickReply` - быстрые ответы
- `MediaFile` - медиа файлы
- `AiSetting` - настройки AI
- `Role` - роли
- `Settings` - настройки системы

## Обработка ошибок

При отсутствии прав доступа возвращается ошибка:
- **403 Forbidden** - с сообщением о недостатке прав

Пример:
```json
{
  "statusCode": 403,
  "message": "Недостаточно прав. Требуемая роль: admin"
}
```

## Тестовый контроллер

Для тестирования системы прав создан `TestPermissionsController` с endpoints:
- `GET /test-permissions/admin-only` - только для администраторов
- `GET /test-permissions/operator-only` - только для операторов
- `GET /test-permissions/read-clients` - проверка права на чтение клиентов
- `GET /test-permissions/manage-users` - проверка права на управление пользователями
- `GET /test-permissions/me` - информация о текущем пользователе
