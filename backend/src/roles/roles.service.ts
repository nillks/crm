import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { defineAbilityFor, AppAbility, Action, Subject } from './abilities.definition';
import { RoleName, Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  /**
   * Получить все роли
   */
  async findAll(): Promise<Role[]> {
    return this.rolesRepository.find({
      order: { name: 'ASC' },
    });
  }

  /**
   * Получить права доступа для пользователя на основе его роли
   */
  getAbilityForUser(user: User): AppAbility {
    if (!user.role) {
      throw new Error('User role is not loaded');
    }

    return defineAbilityFor(user.role.name);
  }

  /**
   * Проверить, имеет ли пользователь право на действие
   */
  can(user: User, action: Action, subject: Subject | string): boolean {
    const ability = this.getAbilityForUser(user);
    return ability.can(action, subject);
  }

  /**
   * Проверить, является ли пользователь администратором
   */
  isAdmin(user: User): boolean {
    return user.role?.name === RoleName.ADMIN;
  }

  /**
   * Проверить, является ли пользователь оператором
   */
  isOperator(user: User): boolean {
    return [
      RoleName.OPERATOR1,
      RoleName.OPERATOR2,
      RoleName.OPERATOR3,
    ].includes(user.role?.name);
  }

  /**
   * Проверить, имеет ли пользователь одну из указанных ролей
   */
  hasRole(user: User, roles: RoleName[]): boolean {
    return roles.includes(user.role?.name);
  }
}
