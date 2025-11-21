import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, ILike, ArrayContains } from 'typeorm';
import { Client } from '../entities/client.entity';
import { ClientComment } from '../entities/client-comment.entity';
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
    @InjectRepository(ClientComment)
    private clientCommentsRepository: Repository<ClientComment>,
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
      this.logger.log(`[ClientsService] Loaded client ${id} with ${client.messages?.length || 0} messages`);
      this.logger.log(`[ClientsService] Client whatsappId: ${client.whatsappId}, telegramId: ${client.telegramId}, phone: ${client.phone}`);
      
      if (client.messages && client.messages.length > 0) {
        const channels = [...new Set(client.messages.map((m: any) => m.channel))];
        const directions = [...new Set(client.messages.map((m: any) => m.direction))];
        const telegramMessages = client.messages.filter((m: any) => {
          const channelStr = String(m.channel || '').toLowerCase().trim();
          return channelStr === 'telegram' || channelStr === 'tg';
        });
        
        this.logger.log(`[ClientsService] Message channels: ${channels.join(', ')}`);
        this.logger.log(`[ClientsService] Message directions: ${directions.join(', ')}`);
        this.logger.log(`[ClientsService] Telegram messages count: ${telegramMessages.length}`);
        
        if (telegramMessages.length > 0) {
          this.logger.log(`[ClientsService] Sample Telegram messages (first 3):`, JSON.stringify(telegramMessages.slice(0, 3).map((m: any) => ({
            id: m.id,
            channel: m.channel,
            channelType: typeof m.channel,
            direction: m.direction,
            directionType: typeof m.direction,
            content: m.content?.substring(0, 50),
            clientId: m.clientId,
            createdAt: m.createdAt,
          })), null, 2));
        }
        
        this.logger.log(`[ClientsService] Sample messages (first 3):`, JSON.stringify(client.messages.slice(0, 3).map((m: any) => ({
          id: m.id,
          channel: m.channel,
          channelType: typeof m.channel,
          direction: m.direction,
          directionType: typeof m.direction,
          content: m.content?.substring(0, 50),
          clientId: m.clientId,
          createdAt: m.createdAt,
        })), null, 2));
      } else {
        this.logger.warn(`[ClientsService] ⚠️ No messages found for client ${id}!`);
        this.logger.warn(`[ClientsService] Client data:`, JSON.stringify({
          id: client.id,
          whatsappId: client.whatsappId,
          telegramId: client.telegramId,
          phone: client.phone,
          name: client.name,
        }, null, 2));
        
        // Проверяем, есть ли сообщения в БД для этого клиента напрямую
        const { Message } = await import('../entities/message.entity');
        const directMessages = await this.clientsRepository.manager.find(Message, {
          where: { clientId: id },
        });
        this.logger.warn(`[ClientsService] Direct DB query found ${directMessages.length} messages for client ${id}`);
        if (directMessages.length > 0) {
          this.logger.warn(`[ClientsService] Direct messages channels:`, [...new Set(directMessages.map(m => m.channel))]);
        }
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

    const savedClient = await this.clientsRepository.save(client);

    // Автоматическое заполнение полей через AI, если есть описание или сообщения
    if (createClientDto.notes) {
      await this.autoFillClientFields(savedClient, createClientDto.notes || '');
    }

    return savedClient;
  }

  /**
   * Автоматическое заполнение полей клиента через AI
   */
  private async autoFillClientFields(client: Client, text: string): Promise<void> {
    if (!text || text.length < 10) {
      return; // Слишком короткий текст для анализа
    }

    try {
      // Используем простой парсинг для извлечения данных
      // В будущем можно использовать AI для более точного извлечения
      const phoneRegex = /(\+?7|8)?[\s\-]?\(?(\d{3})\)?[\s\-]?(\d{3})[\s\-]?(\d{2})[\s\-]?(\d{2})/g;
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

      // Извлекаем телефон
      const phoneMatches = text.match(phoneRegex);
      if (phoneMatches && phoneMatches.length > 0 && !client.phone) {
        let phone = phoneMatches[0].replace(/[\s\-()]/g, '');
        if (phone.startsWith('8')) {
          phone = '7' + phone.substring(1);
        }
        if (!phone.startsWith('7') && phone.length >= 10) {
          phone = '7' + phone;
        }
        client.phone = phone;
      }

      // Извлекаем email
      const emailMatches = text.match(emailRegex);
      if (emailMatches && emailMatches.length > 0 && !client.email) {
        client.email = emailMatches[0];
      }

      // Сохраняем обновления
      if (client.phone || client.email) {
        await this.clientsRepository.save(client);
        this.logger.log(`✅ Auto-filled client fields for ${client.id}: phone=${client.phone}, email=${client.email}`);
      }
    } catch (error) {
      this.logger.error('Error auto-filling client fields:', error);
      // Не прерываем выполнение, если автозаполнение не удалось
    }
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
    // Преобразуем buffer в правильный тип
    const buffer = file.buffer instanceof Buffer ? file.buffer : Buffer.from(file.buffer);
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Файл не содержит данных');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    // Вспомогательная функция для извлечения значения ячейки
    const getCellValue = (cell: any): string | undefined => {
      if (!cell) return undefined;
      
      const value = cell.value;
      
      // Если значение отсутствует
      if (value === null || value === undefined) {
        return undefined;
      }
      
      // Если значение - строка или число, просто конвертируем в строку
      if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
      }
      
      // Если значение - Date объект
      if (value instanceof Date) {
        return value.toISOString();
      }
      
      // Если значение - объект (формула, форматирование и т.д.)
      if (typeof value === 'object') {
        // Для формул ExcelJS: cell.value.result содержит результат формулы
        if ('result' in value && value.result !== null && value.result !== undefined) {
          return String(value.result);
        }
        // Для форматированных чисел: cell.value может иметь свойство text
        if ('text' in value && value.text !== null && value.text !== undefined) {
          return String(value.text);
        }
        // Для других объектов пытаемся извлечь числовое значение
        if ('value' in value && value.value !== null && value.value !== undefined) {
          return String(value.value);
        }
        // Если это объект с числовым представлением
        if (typeof value === 'object' && !Array.isArray(value)) {
          // Пытаемся найти числовое или строковое значение
          const keys = Object.keys(value);
          if (keys.length > 0) {
            // Берем первое примитивное значение
            for (const key of keys) {
              if (typeof value[key] === 'string' || typeof value[key] === 'number') {
                return String(value[key]);
              }
            }
          }
        }
        // Если ничего не подошло, возвращаем undefined
        return undefined;
      }
      
      // Для всех остальных случаев
      return undefined;
    };

    // Пропускаем заголовок (первая строка)
    let rowNumber = 2;
    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return; // Пропускаем заголовок

      try {
        const nameValue = getCellValue(row.getCell(1));
        let phoneValue = getCellValue(row.getCell(2));
        const emailValue = getCellValue(row.getCell(3));
        const telegramIdValue = getCellValue(row.getCell(4));
        const whatsappIdValue = getCellValue(row.getCell(5));
        const instagramIdValue = getCellValue(row.getCell(6));
        const notesValue = getCellValue(row.getCell(7));
        const statusValue = getCellValue(row.getCell(8));

        // Очищаем телефон от лишних символов и проверяем, что это строка
        if (phoneValue) {
          // Убираем все нецифровые символы, кроме +
          phoneValue = phoneValue.replace(/[^\d+]/g, '');
          // Если получилась пустая строка, делаем undefined
          if (phoneValue.trim() === '') {
            phoneValue = undefined;
          }
        }

        const clientData: Partial<CreateClientDto> = {
          name: nameValue || '',
          phone: phoneValue || undefined,
          email: emailValue || undefined,
          telegramId: telegramIdValue || undefined,
          whatsappId: whatsappIdValue || undefined,
          instagramId: instagramIdValue || undefined,
          notes: notesValue || undefined,
          status: (statusValue || 'active') as 'active' | 'inactive' | 'blocked',
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

  /**
   * Получить комментарии клиента
   */
  async getClientComments(clientId: string): Promise<ClientComment[]> {
    return this.clientCommentsRepository.find({
      where: { clientId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Создать комментарий к клиенту
   */
  async createClientComment(clientId: string, userId: string, content: string): Promise<ClientComment> {
    const client = await this.findOne(clientId);
    if (!client) {
      throw new NotFoundException(`Клиент с ID ${clientId} не найден`);
    }

    const comment = this.clientCommentsRepository.create({
      clientId,
      userId,
      content,
    });

    const savedComment = await this.clientCommentsRepository.save(comment);
    
    // Загружаем комментарий с информацией о пользователе
    return this.clientCommentsRepository.findOne({
      where: { id: savedComment.id },
      relations: ['user'],
    }) as Promise<ClientComment>;
  }

  /**
   * Обновить комментарий клиента
   */
  async updateClientComment(commentId: string, userId: string, content: string): Promise<ClientComment> {
    const comment = await this.clientCommentsRepository.findOne({
      where: { id: commentId },
      relations: ['user'],
    });

    if (!comment) {
      throw new NotFoundException(`Комментарий с ID ${commentId} не найден`);
    }

    // Проверяем, что пользователь является автором комментария
    if (comment.userId !== userId) {
      throw new BadRequestException('Вы можете редактировать только свои комментарии');
    }

    comment.content = content;
    await this.clientCommentsRepository.save(comment);
    
    // Загружаем обновленный комментарий с информацией о пользователе
    return this.clientCommentsRepository.findOne({
      where: { id: commentId },
      relations: ['user'],
    }) as Promise<ClientComment>;
  }

  /**
   * Удалить комментарий клиента
   */
  async deleteClientComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.clientCommentsRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Комментарий с ID ${commentId} не найден`);
    }

    // Проверяем, что пользователь является автором комментария
    if (comment.userId !== userId) {
      throw new BadRequestException('Вы можете удалять только свои комментарии');
    }

    await this.clientCommentsRepository.remove(comment);
  }

  /**
   * Экспорт клиентов в Excel файл
   */
  async exportToExcel(filters?: FilterClientsDto): Promise<Buffer> {
    try {
      this.logger.log(`Starting export with filters: ${JSON.stringify(filters || {})}`);
      
      const {
        search,
        name,
        phone,
        email,
        status,
        tags,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = filters || {};

    // Используем ту же логику фильтрации, что и в findAll, но без пагинации
    const queryBuilder = this.clientsRepository.createQueryBuilder('client');

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
      const tagArray = typeof tags === 'string' 
        ? tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
        : Array.isArray(tags) 
          ? tags 
          : [];
      if (tagArray.length > 0) {
        queryBuilder.andWhere('client.tags && :tags', { tags: tagArray });
      }
    }

    // Сортировка
    queryBuilder.orderBy(`client.${sortBy}`, sortOrder);

    // Получаем всех клиентов (без пагинации)
    const allClients = await queryBuilder.getMany();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Клиенты');

    // Заголовки
    worksheet.columns = [
      { header: 'Имя', key: 'name', width: 30 },
      { header: 'Телефон', key: 'phone', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Telegram ID', key: 'telegramId', width: 20 },
      { header: 'WhatsApp ID', key: 'whatsappId', width: 20 },
      { header: 'Instagram ID', key: 'instagramId', width: 20 },
      { header: 'Заметки', key: 'notes', width: 40 },
      { header: 'Статус', key: 'status', width: 15 },
      { header: 'Теги', key: 'tags', width: 30 },
      { header: 'Кастомные поля', key: 'customFields', width: 40 },
      { header: 'Дата создания', key: 'createdAt', width: 20 },
      { header: 'Дата обновления', key: 'updatedAt', width: 20 },
    ];

    // Стили для заголовков
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Данные
    if (allClients.length === 0) {
      // Если клиентов нет, добавляем строку с сообщением
      worksheet.addRow({
        name: 'Клиенты не найдены',
        phone: '',
        email: '',
        telegramId: '',
        whatsappId: '',
        instagramId: '',
        notes: '',
        status: '',
        tags: '',
        customFields: '',
        createdAt: '',
        updatedAt: '',
      });
    } else {
      allClients.forEach((client) => {
        worksheet.addRow({
          name: client.name,
          phone: client.phone || '',
          email: client.email || '',
          telegramId: client.telegramId || '',
          whatsappId: client.whatsappId || '',
          instagramId: client.instagramId || '',
          notes: client.notes || '',
          status: client.status === 'active' ? 'Активен' : client.status === 'inactive' ? 'Неактивен' : 'Заблокирован',
          tags: client.tags?.join(', ') || '',
          customFields: client.customFields ? JSON.stringify(client.customFields) : '',
          createdAt: client.createdAt ? new Date(client.createdAt).toLocaleString('ru-RU') : '',
          updatedAt: client.updatedAt ? new Date(client.updatedAt).toLocaleString('ru-RU') : '',
        });
      });
    }

    // Автоподбор ширины колонок
    worksheet.columns.forEach((column) => {
      if (column.width) {
        column.width = Math.max(column.width || 10, 10);
      }
    });

    // Генерируем буфер
    const buffer = await workbook.xlsx.writeBuffer();
    const result = Buffer.from(buffer);
    this.logger.log(`Export completed successfully. Buffer size: ${result.length} bytes`);
    return result;
    } catch (error: any) {
      this.logger.error(`Error during export: ${error.message}`, error.stack);
      throw error;
    }
  }
}

