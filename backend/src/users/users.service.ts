import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Role, RoleName } from '../entities/role.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['role'],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['role'],
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    // Проверяем, существует ли роль
    if (userData.roleId) {
      const role = await this.rolesRepository.findOne({
        where: { id: userData.roleId },
      });
      
      if (!role) {
        throw new NotFoundException(`Роль с ID ${userData.roleId} не найдена`);
      }

      // Проверяем лимиты пользователей
      if (role.name === RoleName.ADMIN) {
        const adminCount = await this.usersRepository.count({
          where: {
            role: { name: RoleName.ADMIN },
          },
        });
        const maxAdmins = 5;
        if (adminCount >= maxAdmins) {
          throw new BadRequestException(
            `Достигнут лимит администраторов (${maxAdmins}). Невозможно создать нового администратора.`,
          );
        }
      } else if ([RoleName.OPERATOR1, RoleName.OPERATOR2, RoleName.OPERATOR3].includes(role.name)) {
        const operatorsCount = await this.usersRepository.count({
          where: [
            { role: { name: RoleName.OPERATOR1 } },
            { role: { name: RoleName.OPERATOR2 } },
            { role: { name: RoleName.OPERATOR3 } },
          ],
        });
        const maxOperators = 32;
        if (operatorsCount >= maxOperators) {
          throw new BadRequestException(
            `Достигнут лимит операторов (${maxOperators}). Невозможно создать нового оператора.`,
          );
        }
      }
    } else {
      throw new BadRequestException('roleId обязателен для создания пользователя');
    }

    const user = this.usersRepository.create(userData);
    const savedUser = await this.usersRepository.save(user);
    // Загружаем пользователя с ролью
    return this.usersRepository.findOne({
      where: { id: savedUser.id },
      relations: ['role'],
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      lastLoginAt: new Date(),
    });
  }

  /**
   * Поиск пользователей по имени или email
   */
  async searchByName(query: string): Promise<User[]> {
    if (!query || query.length < 2) {
      return [];
    }
    
    return this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.name ILIKE :query', { query: `%${query}%` })
      .orWhere('user.email ILIKE :query', { query: `%${query}%` })
      .take(20)
      .getMany();
  }

  /**
   * Получить всех пользователей с определенной ролью (линией)
   */
  async findByRole(roleName: RoleName): Promise<User[]> {
    return this.usersRepository.find({
      where: {
        role: { name: roleName },
      },
      relations: ['role'],
    });
  }

  /**
   * Получить всех операторов (всех линий)
   */
  async getAllOperators(): Promise<User[]> {
    return this.usersRepository.find({
      where: [
        { role: { name: RoleName.OPERATOR1 } },
        { role: { name: RoleName.OPERATOR2 } },
        { role: { name: RoleName.OPERATOR3 } },
      ],
      relations: ['role'],
    });
  }

  /**
   * Обновить профиль пользователя
   */
  async updateProfile(userId: string, updateData: { name?: string; phone?: string; email?: string }): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Проверяем, не занят ли email другим пользователем
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await this.findByEmail(updateData.email);
      if (existingUser) {
        throw new BadRequestException('Пользователь с таким email уже существует');
      }
    }

    // Обновляем данные
    if (updateData.name) user.name = updateData.name;
    if (updateData.phone !== undefined) user.phone = updateData.phone;
    if (updateData.email) user.email = updateData.email;

    await this.usersRepository.save(user);
    return this.findById(userId);
  }

  /**
   * Изменить пароль пользователя
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Проверяем старый пароль
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new BadRequestException('Неверный текущий пароль');
    }

    // Хешируем новый пароль
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.update(userId, { password: hashedPassword });
  }

  /**
   * Получить статистику лимитов пользователей
   */
  async getUsersLimits(): Promise<{
    operators: { used: number; limit: number; percentage: number };
    admins: { used: number; limit: number; percentage: number };
  }> {
    const operatorsCount = await this.usersRepository.count({
      where: [
        { role: { name: RoleName.OPERATOR1 } },
        { role: { name: RoleName.OPERATOR2 } },
        { role: { name: RoleName.OPERATOR3 } },
      ],
    });

    const adminsCount = await this.usersRepository.count({
      where: { role: { name: RoleName.ADMIN } },
    });

    const maxOperators = 32;
    const maxAdmins = 5;

    return {
      operators: {
        used: operatorsCount,
        limit: maxOperators,
        percentage: (operatorsCount / maxOperators) * 100,
      },
      admins: {
        used: adminsCount,
        limit: maxAdmins,
        percentage: (adminsCount / maxAdmins) * 100,
      },
    };
  }
}
