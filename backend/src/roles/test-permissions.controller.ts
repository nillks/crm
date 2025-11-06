import { Controller, Get } from '@nestjs/common';
import { Roles } from './decorators/roles.decorator';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { UseGuards } from '@nestjs/common';
import { RoleName } from '../entities/role.entity';
import { Action, Subject } from './abilities.definition';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

/**
 * Тестовый контроллер для проверки системы прав доступа
 */
@Controller('test-permissions')
@UseGuards(RolesGuard, PermissionsGuard)
export class TestPermissionsController {
  /**
   * Только администратор может получить доступ
   */
  @Get('admin-only')
  @Roles(RoleName.ADMIN)
  adminOnly(@GetUser() user: User) {
    return {
      message: 'Этот endpoint доступен только администраторам',
      user: {
        id: user.id,
        name: user.name,
        role: user.role.name,
      },
    };
  }

  /**
   * Доступен любым операторам
   */
  @Get('operator-only')
  @Roles(RoleName.OPERATOR1, RoleName.OPERATOR2, RoleName.OPERATOR3)
  operatorOnly(@GetUser() user: User) {
    return {
      message: 'Этот endpoint доступен только операторам',
      user: {
        id: user.id,
        name: user.name,
        role: user.role.name,
      },
    };
  }

  /**
   * Проверка прав через permissions
   */
  @Get('read-clients')
  @RequirePermissions({ action: Action.Read, subject: Subject.Client })
  readClients(@GetUser() user: User) {
    return {
      message: 'У вас есть право на чтение клиентов',
      user: {
        id: user.id,
        name: user.name,
        role: user.role.name,
      },
    };
  }

  /**
   * Проверка прав на управление пользователями (только админ)
   */
  @Get('manage-users')
  @RequirePermissions({ action: Action.Manage, subject: Subject.User })
  manageUsers(@GetUser() user: User) {
    return {
      message: 'У вас есть право на управление пользователями',
      user: {
        id: user.id,
        name: user.name,
        role: user.role.name,
      },
    };
  }

  /**
   * Публичный endpoint для проверки текущего пользователя
   */
  @Get('me')
  getMe(@GetUser() user: User) {
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: {
          id: user.role.id,
          name: user.role.name,
          description: user.role.description,
        },
      },
    };
  }
}
