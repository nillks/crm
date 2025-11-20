import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupportLine } from '../entities/support-line.entity';
import { User } from '../entities/user.entity';
import { Role, RoleName } from '../entities/role.entity';
import { CreateSupportLineDto, UpdateSupportLineDto } from './dto/create-support-line.dto';

@Injectable()
export class SupportLinesService {
  constructor(
    @InjectRepository(SupportLine)
    private supportLinesRepository: Repository<SupportLine>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  /**
   * Создать линию поддержки
   */
  async create(createDto: CreateSupportLineDto): Promise<SupportLine> {
    // Проверяем, что код уникален
    const existing = await this.supportLinesRepository.findOne({
      where: { code: createDto.code },
    });

    if (existing) {
      throw new BadRequestException(`Линия с кодом ${createDto.code} уже существует`);
    }

    const line = this.supportLinesRepository.create(createDto);
    return this.supportLinesRepository.save(line);
  }

  /**
   * Получить все линии поддержки
   */
  async findAll(): Promise<SupportLine[]> {
    return this.supportLinesRepository.find({
      relations: ['operators', 'operators.role'],
      order: { code: 'ASC' },
    });
  }

  /**
   * Получить линию по ID
   */
  async findOne(id: string): Promise<SupportLine> {
    const line = await this.supportLinesRepository.findOne({
      where: { id },
      relations: ['operators', 'operators.role'],
    });

    if (!line) {
      throw new NotFoundException(`Линия с ID ${id} не найдена`);
    }

    return line;
  }

  /**
   * Получить линию по коду
   */
  async findByCode(code: string): Promise<SupportLine | null> {
    return this.supportLinesRepository.findOne({
      where: { code },
      relations: ['operators', 'operators.role'],
    });
  }

  /**
   * Обновить линию поддержки
   */
  async update(id: string, updateDto: UpdateSupportLineDto): Promise<SupportLine> {
    const line = await this.findOne(id);

    if (updateDto.code && updateDto.code !== line.code) {
      const existing = await this.supportLinesRepository.findOne({
        where: { code: updateDto.code },
      });

      if (existing) {
        throw new BadRequestException(`Линия с кодом ${updateDto.code} уже существует`);
      }
    }

    Object.assign(line, updateDto);
    return this.supportLinesRepository.save(line);
  }

  /**
   * Удалить линию поддержки
   */
  async remove(id: string): Promise<void> {
    const line = await this.findOne(id);

    // Проверяем, что на линии нет операторов
    const operatorsCount = await this.usersRepository.count({
      where: { supportLineId: id },
    });

    if (operatorsCount > 0) {
      throw new BadRequestException(
        `Невозможно удалить линию: на ней закреплено ${operatorsCount} операторов`,
      );
    }

    await this.supportLinesRepository.remove(line);
  }

  /**
   * Назначить оператора на линию
   */
  async assignOperator(lineId: string, userId: string): Promise<User> {
    const line = await this.findOne(lineId);
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    // Проверяем, что пользователь - оператор
    if (!['operator1', 'operator2', 'operator3'].includes(user.role?.name || '')) {
      throw new BadRequestException('На линию можно назначить только операторов');
    }

    // Проверяем лимит операторов
    const operatorsCount = await this.usersRepository.count({
      where: { supportLineId: lineId },
    });

    if (line.maxOperators > 0 && operatorsCount >= line.maxOperators) {
      throw new BadRequestException(
        `Достигнут лимит операторов на линии (${line.maxOperators})`,
      );
    }

    user.supportLineId = lineId;
    return this.usersRepository.save(user);
  }

  /**
   * Убрать оператора с линии
   */
  async unassignOperator(userId: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    user.supportLineId = null;
    return this.usersRepository.save(user);
  }

  /**
   * Получить доступного оператора для назначения тикета (round-robin)
   */
  async getAvailableOperator(lineId: string): Promise<User | null> {
    const line = await this.findOne(lineId);

    if (!line.isActive) {
      return null;
    }

    // Получаем всех активных операторов линии
    const operators = await this.usersRepository.find({
      where: {
        supportLineId: lineId,
        status: 'active',
      },
      relations: ['role'],
    });

    if (operators.length === 0) {
      return null;
    }

    // Если включен round-robin, выбираем оператора с наименьшим количеством активных тикетов
    if (line.settings?.roundRobin) {
      // TODO: Реализовать выбор по загрузке (количество активных тикетов)
      // Пока просто выбираем первого
      return operators[0];
    }

    // Иначе выбираем первого доступного
    return operators[0];
  }

  /**
   * Инициализация линий по умолчанию
   */
  async initializeDefaultLines(): Promise<void> {
    const defaultLines = [
      {
        name: 'Линия поддержки №1',
        code: 'operator1',
        description: 'Основная линия поддержки',
        isActive: true,
        maxOperators: 0,
        settings: {
          autoAssign: true,
          roundRobin: true,
          priority: 1,
        },
      },
      {
        name: 'Линия поддержки №2',
        code: 'operator2',
        description: 'Вторая линия поддержки',
        isActive: true,
        maxOperators: 0,
        settings: {
          autoAssign: true,
          roundRobin: true,
          priority: 2,
        },
      },
      {
        name: 'Линия поддержки №3',
        code: 'operator3',
        description: 'Третья линия поддержки',
        isActive: true,
        maxOperators: 0,
        settings: {
          autoAssign: true,
          roundRobin: true,
          priority: 3,
        },
      },
    ];

    for (const lineData of defaultLines) {
      const existing = await this.supportLinesRepository.findOne({
        where: { code: lineData.code },
      });

      if (!existing) {
        await this.supportLinesRepository.save(
          this.supportLinesRepository.create(lineData),
        );
      }
    }
  }
}

