import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';

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
}
