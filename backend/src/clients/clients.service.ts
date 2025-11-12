import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, ILike } from 'typeorm';
import { Client } from '../entities/client.entity';
import { CreateClientDto, UpdateClientDto, FilterClientsDto } from './dto';

export interface PaginatedClients {
  data: Client[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
  ) {}

  /**
   * Получить список клиентов с пагинацией и фильтрами
   */
  async findAll(filterDto: FilterClientsDto): Promise<PaginatedClients> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
      name,
      phone,
      email,
      status,
      include,
    } = filterDto;

    const skip = (page - 1) * limit;

    // Определяем связи для загрузки
    const relations: string[] = [];
    if (include) {
      const includes = include.split(',');
      if (includes.includes('tickets')) relations.push('tickets');
      if (includes.includes('messages')) relations.push('messages');
      if (includes.includes('calls')) relations.push('calls');
    }

    // Строим условия поиска
    const where: FindOptionsWhere<Client>[] = [];

    // Если указан общий поиск, ищем по имени, телефону или email
    if (search) {
      // Используем OR условие для поиска по нескольким полям
      where.push(
        { name: ILike(`%${search}%`) },
        { phone: ILike(`%${search}%`) },
        { email: ILike(`%${search}%`) },
      );
    } else {
      // Иначе используем конкретные фильтры
      const conditions: FindOptionsWhere<Client> = {};
      if (name) conditions.name = ILike(`%${name}%`);
      if (phone) conditions.phone = ILike(`%${phone}%`);
      if (email) conditions.email = ILike(`%${email}%`);
      if (status) conditions.status = status;

      if (Object.keys(conditions).length > 0) {
        where.push(conditions);
      }
    }

    // Если нет условий, получаем все записи
    const whereCondition = where.length > 0 ? where : undefined;

    // Выполняем запрос
    const [data, total] = await this.clientsRepository.findAndCount({
      where: whereCondition,
      relations,
      order: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Получить клиента по ID
   */
  async findOne(id: string, include?: string): Promise<Client> {
    const relations: string[] = [];
    if (include) {
      const includes = include.split(',');
      if (includes.includes('tickets')) relations.push('tickets');
      if (includes.includes('messages')) relations.push('messages');
      if (includes.includes('calls')) relations.push('calls');
    }

    const client = await this.clientsRepository.findOne({
      where: { id },
      relations,
    });

    if (!client) {
      throw new NotFoundException(`Клиент с ID ${id} не найден`);
    }

    return client;
  }

  /**
   * Создать нового клиента
   */
  async create(createClientDto: CreateClientDto): Promise<Client> {
    // Проверяем уникальность email, если указан
    if (createClientDto.email) {
      const existingClient = await this.clientsRepository.findOne({
        where: { email: createClientDto.email },
      });
      if (existingClient) {
        throw new BadRequestException(
          `Клиент с email ${createClientDto.email} уже существует`,
        );
      }
    }

    // Проверяем уникальность телефона, если указан
    if (createClientDto.phone) {
      const existingClient = await this.clientsRepository.findOne({
        where: { phone: createClientDto.phone },
      });
      if (existingClient) {
        throw new BadRequestException(
          `Клиент с телефоном ${createClientDto.phone} уже существует`,
        );
      }
    }

    const client = this.clientsRepository.create({
      ...createClientDto,
      status: createClientDto.status || 'active',
    });

    return this.clientsRepository.save(client);
  }

  /**
   * Обновить клиента
   */
  async update(id: string, updateClientDto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);

    // Проверяем уникальность email, если он изменяется
    if (updateClientDto.email && updateClientDto.email !== client.email) {
      const existingClient = await this.clientsRepository.findOne({
        where: { email: updateClientDto.email },
      });
      if (existingClient) {
        throw new BadRequestException(
          `Клиент с email ${updateClientDto.email} уже существует`,
        );
      }
    }

    // Проверяем уникальность телефона, если он изменяется
    if (updateClientDto.phone && updateClientDto.phone !== client.phone) {
      const existingClient = await this.clientsRepository.findOne({
        where: { phone: updateClientDto.phone },
      });
      if (existingClient) {
        throw new BadRequestException(
          `Клиент с телефоном ${updateClientDto.phone} уже существует`,
        );
      }
    }

    Object.assign(client, updateClientDto);
    return this.clientsRepository.save(client);
  }

  /**
   * Удалить клиента
   */
  async remove(id: string): Promise<void> {
    const client = await this.findOne(id);
    await this.clientsRepository.remove(client);
  }
}

