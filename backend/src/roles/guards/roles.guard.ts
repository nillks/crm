import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleName } from '../../entities/role.entity';
import { RolesService } from '../roles.service';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rolesService: RolesService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Пользователь не авторизован');
    }

    const hasRole = this.rolesService.hasRole(user, requiredRoles);

    if (!hasRole) {
      throw new ForbiddenException(
        `Недостаточно прав. Требуемая роль: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
