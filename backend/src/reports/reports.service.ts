import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { Call } from '../entities/call.entity';
import { Client } from '../entities/client.entity';
import { User } from '../entities/user.entity';
import { Message } from '../entities/message.entity';
import { GenerateReportDto, ReportType } from './dto/generate-report.dto';
import * as ExcelJS from 'exceljs';
import { TelegramService } from '../telegram/telegram.service';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly reportsDir: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(Call)
    private callsRepository: Repository<Call>,
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    private telegramService: TelegramService,
  ) {
    this.reportsDir = this.configService.get('REPORTS_DIR', path.join(process.cwd(), 'reports'));
    // Создаем директорию для отчётов
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * Генерация отчёта
   */
  async generateReport(dto: GenerateReportDto): Promise<{ filePath: string; fileName: string }> {
    const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;

    let workbook: ExcelJS.Workbook;
    let fileName: string;

    switch (dto.type) {
      case ReportType.TICKETS:
        workbook = await this.generateTicketsReport(startDate, endDate);
        fileName = `tickets_report_${Date.now()}.xlsx`;
        break;
      case ReportType.CALLS:
        workbook = await this.generateCallsReport(startDate, endDate);
        fileName = `calls_report_${Date.now()}.xlsx`;
        break;
      case ReportType.OPERATORS:
        workbook = await this.generateOperatorsReport(startDate, endDate);
        fileName = `operators_report_${Date.now()}.xlsx`;
        break;
      case ReportType.CLIENTS:
        workbook = await this.generateClientsReport(startDate, endDate);
        fileName = `clients_report_${Date.now()}.xlsx`;
        break;
      default:
        throw new BadRequestException(`Unknown report type: ${dto.type}`);
    }

    const filePath = path.join(this.reportsDir, fileName);
    await workbook.xlsx.writeFile(filePath);

    this.logger.log(`✅ Report generated: ${fileName}`);

    // Если указан Telegram chat ID, отправляем отчёт
    if (dto.telegramChatId) {
      await this.sendReportToTelegram(filePath, fileName, dto.telegramChatId);
    }

    return { filePath, fileName };
  }

  /**
   * Генерация отчёта по тикетам
   */
  private async generateTicketsReport(startDate?: Date, endDate?: Date): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Тикеты');

    // Заголовки
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Название', key: 'title', width: 30 },
      { header: 'Клиент', key: 'client', width: 25 },
      { header: 'Статус', key: 'status', width: 15 },
      { header: 'Канал', key: 'channel', width: 15 },
      { header: 'Приоритет', key: 'priority', width: 10 },
      { header: 'Создан', key: 'createdBy', width: 20 },
      { header: 'Назначен', key: 'assignedTo', width: 20 },
      { header: 'Дата создания', key: 'createdAt', width: 20 },
      { header: 'Дата закрытия', key: 'closedAt', width: 20 },
    ];

    // Стилизация заголовков
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Запрос данных
    const queryBuilder = this.ticketsRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.client', 'client')
      .leftJoinAndSelect('ticket.createdBy', 'createdBy')
      .leftJoinAndSelect('ticket.assignedTo', 'assignedTo');

    if (startDate && endDate) {
      queryBuilder.where('ticket.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      queryBuilder.where('ticket.createdAt >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.where('ticket.createdAt <= :endDate', { endDate });
    }

    const tickets = await queryBuilder.getMany();

    // Добавляем данные
    tickets.forEach((ticket) => {
      worksheet.addRow({
        id: ticket.id,
        title: ticket.title,
        client: ticket.client?.name || 'N/A',
        status: ticket.status,
        channel: ticket.channel,
        priority: ticket.priority,
        createdBy: ticket.createdBy?.email || 'N/A',
        assignedTo: ticket.assignedTo?.email || 'N/A',
        createdAt: ticket.createdAt.toLocaleString('ru-RU'),
        closedAt: ticket.closedAt ? ticket.closedAt.toLocaleString('ru-RU') : '-',
      });
    });

    // Добавляем итоговую строку
    worksheet.addRow({});
    worksheet.addRow({
      id: 'ИТОГО',
      title: `Всего тикетов: ${tickets.length}`,
    });

    return workbook;
  }

  /**
   * Генерация отчёта по звонкам
   */
  private async generateCallsReport(startDate?: Date, endDate?: Date): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Звонки');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Клиент', key: 'client', width: 25 },
      { header: 'Оператор', key: 'operator', width: 20 },
      { header: 'Тип', key: 'type', width: 15 },
      { header: 'Статус', key: 'status', width: 15 },
      { header: 'Длительность (сек)', key: 'duration', width: 15 },
      { header: 'Дата начала', key: 'startedAt', width: 20 },
      { header: 'Дата окончания', key: 'endedAt', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    const queryBuilder = this.callsRepository
      .createQueryBuilder('call')
      .leftJoinAndSelect('call.client', 'client')
      .leftJoinAndSelect('call.operator', 'operator');

    if (startDate && endDate) {
      queryBuilder.where('call.startedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      queryBuilder.where('call.startedAt >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.where('call.startedAt <= :endDate', { endDate });
    }

    const calls = await this.callsRepository.find({
      relations: ['client', 'operator'],
      where: startDate && endDate
        ? { startedAt: Between(startDate, endDate) }
        : startDate
        ? { startedAt: Between(startDate, new Date()) }
        : endDate
        ? { startedAt: Between(new Date(0), endDate) }
        : {},
    });

    calls.forEach((call) => {
      const duration = call.endedAt && call.startedAt
        ? Math.round((call.endedAt.getTime() - call.startedAt.getTime()) / 1000)
        : 0;

      worksheet.addRow({
        id: call.id,
        client: call.client?.name || 'N/A',
        operator: call.operator?.email || 'N/A',
        type: call.type,
        status: call.status,
        duration,
        startedAt: call.startedAt.toLocaleString('ru-RU'),
        endedAt: call.endedAt ? call.endedAt.toLocaleString('ru-RU') : '-',
      });
    });

    worksheet.addRow({});
    worksheet.addRow({
      id: 'ИТОГО',
      client: `Всего звонков: ${calls.length}`,
    });

    return workbook;
  }

  /**
   * Генерация отчёта по операторам
   */
  private async generateOperatorsReport(startDate?: Date, endDate?: Date): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Операторы');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Имя', key: 'name', width: 25 },
      { header: 'Роль', key: 'role', width: 20 },
      { header: 'Тикетов создано', key: 'ticketsCreated', width: 15 },
      { header: 'Тикетов назначено', key: 'ticketsAssigned', width: 15 },
      { header: 'Звонков', key: 'callsCount', width: 15 },
      { header: 'Сообщений отправлено', key: 'messagesSent', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    const users = await this.usersRepository.find({
      relations: ['role'],
    });

    for (const user of users) {
      const ticketsCreatedQuery = this.ticketsRepository
        .createQueryBuilder('ticket')
        .where('ticket.createdById = :userId', { userId: user.id });

      const ticketsAssignedQuery = this.ticketsRepository
        .createQueryBuilder('ticket')
        .where('ticket.assignedToId = :userId', { userId: user.id });

      const callsQuery = this.callsRepository
        .createQueryBuilder('call')
        .where('call.operatorId = :userId', { userId: user.id });

      const messagesQuery = this.messagesRepository
        .createQueryBuilder('message')
        .where('message.direction = :direction', { direction: 'outbound' });

      if (startDate && endDate) {
        ticketsCreatedQuery.andWhere('ticket.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
        ticketsAssignedQuery.andWhere('ticket.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
        callsQuery.andWhere('call.startedAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
        messagesQuery.andWhere('message.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      }

      const ticketsCreated = await ticketsCreatedQuery.getCount();
      const ticketsAssigned = await ticketsAssignedQuery.getCount();
      const callsCount = await callsQuery.getCount();
      const messagesSent = await messagesQuery.getCount();

      worksheet.addRow({
        id: user.id,
        email: user.email,
        name: user.name || 'N/A',
        role: user.role?.name || 'N/A',
        ticketsCreated,
        ticketsAssigned,
        callsCount,
        messagesSent,
      });
    }

    worksheet.addRow({});
    worksheet.addRow({
      id: 'ИТОГО',
      email: `Всего операторов: ${users.length}`,
    });

    return workbook;
  }

  /**
   * Генерация отчёта по клиентам
   */
  private async generateClientsReport(startDate?: Date, endDate?: Date): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Клиенты');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Имя', key: 'name', width: 30 },
      { header: 'Телефон', key: 'phone', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Тикетов', key: 'ticketsCount', width: 15 },
      { header: 'Звонков', key: 'callsCount', width: 15 },
      { header: 'Сообщений', key: 'messagesCount', width: 15 },
      { header: 'Дата создания', key: 'createdAt', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    const queryBuilder = this.clientsRepository.createQueryBuilder('client');

    if (startDate && endDate) {
      queryBuilder.where('client.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      queryBuilder.where('client.createdAt >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.where('client.createdAt <= :endDate', { endDate });
    }

    const clients = await queryBuilder.getMany();

    for (const client of clients) {
      const ticketsCount = await this.ticketsRepository.count({
        where: { clientId: client.id },
      });

      const callsCount = await this.callsRepository.count({
        where: { clientId: client.id },
      });

      const messagesCount = await this.messagesRepository.count({
        where: { clientId: client.id },
      });

      worksheet.addRow({
        id: client.id,
        name: client.name,
        phone: client.phone || '-',
        email: client.email || '-',
        ticketsCount,
        callsCount,
        messagesCount,
        createdAt: client.createdAt.toLocaleString('ru-RU'),
      });
    }

    worksheet.addRow({});
    worksheet.addRow({
      id: 'ИТОГО',
      name: `Всего клиентов: ${clients.length}`,
    });

    return workbook;
  }

  /**
   * Отправка отчёта в Telegram
   */
  private async sendReportToTelegram(filePath: string, fileName: string, chatId: string): Promise<void> {
    try {
      // Читаем файл
      const fileBuffer = fs.readFileSync(filePath);

      // Отправляем файл через Telegram
      // Используем прямой вызов Telegram API, так как Telegraf может не поддерживать отправку документов напрямую
      const botToken = this.configService.get('TELEGRAM_BOT_TOKEN', '');
      if (!botToken) {
        this.logger.warn('TELEGRAM_BOT_TOKEN not set. Cannot send report to Telegram.');
        return;
      }

      // Используем FormData для отправки файла
      const FormData = require('form-data');
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('document', fileBuffer, {
        filename: fileName,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      form.append('caption', `Отчёт: ${fileName}`);

      await firstValueFrom(
        this.httpService.post(`https://api.telegram.org/bot${botToken}/sendDocument`, form, {
          headers: form.getHeaders(),
        }),
      );

      this.logger.log(`✅ Report sent to Telegram: ${chatId}`);

      // Удаляем временный файл после отправки
      await unlink(filePath);
    } catch (error: any) {
      this.logger.error(`Failed to send report to Telegram: ${error.message}`);
      // Не удаляем файл, если отправка не удалась
    }
  }

  /**
   * Получить файл отчёта
   */
  async getReportFile(fileName: string): Promise<string> {
    const filePath = path.join(this.reportsDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException(`Report file ${fileName} not found`);
    }
    return filePath;
  }
}

