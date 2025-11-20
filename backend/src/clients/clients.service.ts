import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, ILike, ArrayContains } from 'typeorm';
import { Client } from '../entities/client.entity';
import { CreateClientDto, UpdateClientDto, FilterClientsDto } from './dto';
import * as ExcelJS from 'exceljs';
import csv from 'csv-parser';
import { Readable } from 'stream';

export interface PaginatedClients {
  data: Client[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

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
      tags,
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
    let queryBuilder = this.clientsRepository.createQueryBuilder('client');

    // Добавляем связи
    if (relations.includes('tickets')) {
      queryBuilder.leftJoinAndSelect('client.tickets', 'tickets');
    }
    if (relations.includes('messages')) {
      queryBuilder.leftJoinAndSelect('client.messages', 'messages');
    }
    if (relations.includes('calls')) {
      queryBuilder.leftJoinAndSelect('client.calls', 'calls');
    }

    // Если указан общий поиск, ищем по имени, телефону или email
    if (search) {
      queryBuilder.where(
        '(client.name ILIKE :search OR client.phone ILIKE :search OR client.email ILIKE :search)',
        { search: `%${search}%` },
      );
    } else {
      // Иначе используем конкретные фильтры
      if (name) {
        queryBuilder.andWhere('client.name ILIKE :name', { name: `%${name}%` });
      }
      if (phone) {
        queryBuilder.andWhere('client.phone ILIKE :phone', { phone: `%${phone}%` });
      }
      if (email) {
        queryBuilder.andWhere('client.email ILIKE :email', { email: `%${email}%` });
      }
      if (status) {
        queryBuilder.andWhere('client.status = :status', { status });
      }
    }

    // Фильтр по тегам
    if (tags) {
      const tagArray = tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
      if (tagArray.length > 0) {
        queryBuilder.andWhere('client.tags && :tags', { tags: tagArray });
      }
    }

    // Сортировка
    queryBuilder.orderBy(`client.${sortBy}`, sortOrder);

    // Пагинация
    queryBuilder.skip(skip).take(limit);

    // Выполняем запрос
    const [data, total] = await queryBuilder.getManyAndCount();

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

    // Если нужно загрузить сообщения, используем QueryBuilder для правильной сортировки
    if (relations.includes('messages')) {
      const client = await this.clientsRepository
        .createQueryBuilder('client')
        .leftJoinAndSelect('client.messages', 'messages')
        .where('client.id = :id', { id })
        .orderBy('messages.createdAt', 'ASC')
        .addOrderBy('messages.id', 'ASC') // Дополнительная сортировка для стабильности
        .getOne();

      if (!client) {
        throw new NotFoundException(`Клиент с ID ${id} не найден`);
      }

      // Диагностика: проверяем, что сообщения загружены
      console.log(`[ClientsService] Loaded client ${id} with ${client.messages?.length || 0} messages`);
      console.log(`[ClientsService] Client whatsappId: ${client.whatsappId}, phone: ${client.phone}`);
      if (client.messages && client.messages.length > 0) {
        console.log(`[ClientsService] Message channels:`, [...new Set(client.messages.map((m: any) => m.channel))]);
        console.log(`[ClientsService] Message directions:`, [...new Set(client.messages.map((m: any) => m.direction))]);
        console.log(`[ClientsService] Sample messages (first 3):`, client.messages.slice(0, 3).map((m: any) => ({
          id: m.id,
          channel: m.channel,
          direction: m.direction,
          content: m.content?.substring(0, 50),
          clientId: m.clientId,
          createdAt: m.createdAt,
        })));
      } else {
        console.warn(`[ClientsService] ⚠️ No messages found for client ${id}!`);
        console.warn(`[ClientsService] Client data:`, {
          id: client.id,
          whatsappId: client.whatsappId,
          phone: client.phone,
          name: client.name,
        });
      }

      // Загружаем остальные relations если нужно
      if (relations.includes('tickets')) {
        await this.clientsRepository
          .createQueryBuilder('client')
          .leftJoinAndSelect('client.tickets', 'tickets')
          .where('client.id = :id', { id })
          .getOne()
          .then((c) => {
            if (c) client.tickets = c.tickets;
          });
      }

      if (relations.includes('calls')) {
        await this.clientsRepository
          .createQueryBuilder('client')
          .leftJoinAndSelect('client.calls', 'calls')
          .where('client.id = :id', { id })
          .getOne()
          .then((c) => {
            if (c) client.calls = c.calls;
          });
      }

      return client;
    }

    // Для остальных случаев используем обычный findOne
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

  /**
   * Импорт клиентов из Excel файла
   */
  async importFromExcel(file: Express.Multer.File): Promise<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Файл не содержит данных');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    // Пропускаем заголовок (первая строка)
    let rowNumber = 2;
    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return; // Пропускаем заголовок

      try {
        const clientData: Partial<CreateClientDto> = {
          name: row.getCell(1).value?.toString() || '',
          phone: row.getCell(2).value?.toString() || undefined,
          email: row.getCell(3).value?.toString() || undefined,
          telegramId: row.getCell(4).value?.toString() || undefined,
          whatsappId: row.getCell(5).value?.toString() || undefined,
          instagramId: row.getCell(6).value?.toString() || undefined,
          notes: row.getCell(7).value?.toString() || undefined,
          status: (row.getCell(8).value?.toString() || 'active') as 'active' | 'inactive' | 'blocked',
        };

        if (!clientData.name) {
          results.failed++;
          results.errors.push({ row: rowNumber, error: 'Имя обязательно' });
          return;
        }

        // Проверяем уникальность
        this.clientsRepository
          .findOne({
            where: [
              clientData.email ? { email: clientData.email } : {},
              clientData.phone ? { phone: clientData.phone } : {},
            ].filter((w) => Object.keys(w).length > 0),
          })
          .then(async (existing) => {
            if (existing) {
              results.failed++;
              results.errors.push({
                row: rowNumber,
                error: 'Клиент с таким email или телефоном уже существует',
              });
            } else {
              await this.clientsRepository.save(
                this.clientsRepository.create(clientData),
              );
              results.success++;
            }
          })
          .catch((error) => {
            results.failed++;
            results.errors.push({
              row: rowNumber,
              error: error.message || 'Ошибка при создании клиента',
            });
          });
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          error: error.message || 'Ошибка при обработке строки',
        });
      }

      rowNumber++;
    });

    // Ждем завершения всех асинхронных операций
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return results;
  }

  /**
   * Импорт клиентов из CSV файла
   */
  async importFromCSV(file: Express.Multer.File): Promise<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    return new Promise((resolve, reject) => {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ row: number; error: string }>,
      };

      let rowNumber = 1;
      const stream = Readable.from(file.buffer);

      stream
        .pipe(csv())
        .on('data', async (row: any) => {
          rowNumber++;
          try {
            const clientData: Partial<CreateClientDto> = {
              name: row.name || row['Имя'] || '',
              phone: row.phone || row['Телефон'] || undefined,
              email: row.email || row['Email'] || undefined,
              telegramId: row.telegramId || row['Telegram ID'] || undefined,
              whatsappId: row.whatsappId || row['WhatsApp ID'] || undefined,
              instagramId: row.instagramId || row['Instagram ID'] || undefined,
              notes: row.notes || row['Заметки'] || undefined,
              status: (row.status || row['Статус'] || 'active') as
                | 'active'
                | 'inactive'
                | 'blocked',
            };

            if (!clientData.name) {
              results.failed++;
              results.errors.push({
                row: rowNumber,
                error: 'Имя обязательно',
              });
              return;
            }

            // Проверяем уникальность
            const existing = await this.clientsRepository.findOne({
              where: [
                clientData.email ? { email: clientData.email } : {},
                clientData.phone ? { phone: clientData.phone } : {},
              ].filter((w) => Object.keys(w).length > 0),
            });

            if (existing) {
              results.failed++;
              results.errors.push({
                row: rowNumber,
                error: 'Клиент с таким email или телефоном уже существует',
              });
            } else {
              await this.clientsRepository.save(
                this.clientsRepository.create(clientData),
              );
              results.success++;
            }
          } catch (error: any) {
            results.failed++;
            results.errors.push({
              row: rowNumber,
              error: error.message || 'Ошибка при обработке строки',
            });
          }
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }
}

