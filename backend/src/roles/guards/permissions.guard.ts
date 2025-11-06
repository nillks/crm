import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, Permission } from '../decorators/require-permissions.decorator';
import { RolesService } from '../roles.service';
import { Action, Subject } from '../abilities.definition';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rolesService: RolesService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Пользователь не авторизован');
    }

    // Проверяем каждое требуемое разрешение
    for (const permission of requiredPermissions) {
      const hasPermission = this.rolesService.can(
        user,
        permission.action,
        permission.subject,
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Недостаточно прав. Требуется: ${permission.action} ${permission.subject}`,
        );
      }
    }

    return true;
  }
}
