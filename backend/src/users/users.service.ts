import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
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
}
