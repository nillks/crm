import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScheduledReport, ScheduleFrequency, ReportType, ReportFormat } from '../entities/scheduled-report.entity';
import { User } from '../entities/user.entity';
import { CreateScheduledReportDto, UpdateScheduledReportDto } from './dto/create-scheduled-report.dto';
import { ReportsService } from '../reports/reports.service';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class ScheduledReportsService {
  private readonly logger = new Logger(ScheduledReportsService.name);

  constructor(
    @InjectRepository(ScheduledReport)
    private scheduledReportsRepository: Repository<ScheduledReport>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private reportsService: ReportsService,
    private telegramService: TelegramService,
  ) {}

  /**
   * Создать расписание отчёта
   */
  async create(dto: CreateScheduledReportDto, userId: string): Promise<ScheduledReport> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    const scheduledReport = this.scheduledReportsRepository.create({
      ...dto,
      userId,
      nextRunAt: this.calculateNextRun(dto),
    });

    return this.scheduledReportsRepository.save(scheduledReport);
  }

  /**
   * Получить все расписания пользователя
   */
  async findAll(userId: string): Promise<ScheduledReport[]> {
    return this.scheduledReportsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Получить расписание по ID
   */
  async findOne(id: string, userId: string): Promise<ScheduledReport> {
    const scheduledReport = await this.scheduledReportsRepository.findOne({
      where: { id, userId },
    });

    if (!scheduledReport) {
      throw new NotFoundException(`Расписание с ID ${id} не найдено`);
    }

    return scheduledReport;
  }

  /**
   * Обновить расписание
   */
  async update(id: string, dto: UpdateScheduledReportDto, userId: string): Promise<ScheduledReport> {
    const scheduledReport = await this.findOne(id, userId);

    Object.assign(scheduledReport, dto);
    
    // Пересчитываем следующий запуск, если изменились параметры расписания
    if (dto.frequency || dto.time || dto.dayOfWeek || dto.dayOfMonth) {
      scheduledReport.nextRunAt = this.calculateNextRun(scheduledReport);
    }

    return this.scheduledReportsRepository.save(scheduledReport);
  }

  /**
   * Удалить расписание
   */
  async remove(id: string, userId: string): Promise<void> {
    const scheduledReport = await this.findOne(id, userId);
    await this.scheduledReportsRepository.remove(scheduledReport);
  }

  /**
   * Вычислить следующий запуск
   */
  private calculateNextRun(scheduledReport: ScheduledReport | CreateScheduledReportDto): Date {
    const now = new Date();
    const nextRun = new Date();

    // Устанавливаем время
    if (scheduledReport.time) {
      const [hours, minutes] = scheduledReport.time.split(':').map(Number);
      nextRun.setHours(hours, minutes, 0, 0);
    } else {
      nextRun.setHours(9, 0, 0, 0); // По умолчанию 9:00
    }

    switch (scheduledReport.frequency) {
      case ScheduleFrequency.DAILY:
        // Если время уже прошло сегодня, планируем на завтра
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;

      case ScheduleFrequency.WEEKLY:
        // Планируем на указанный день недели
        const dayOfWeek = scheduledReport.dayOfWeek ?? 1; // По умолчанию понедельник
        const currentDay = now.getDay();
        let daysToAdd = dayOfWeek - currentDay;
        if (daysToAdd <= 0 || (daysToAdd === 0 && nextRun <= now)) {
          daysToAdd += 7;
        }
        nextRun.setDate(nextRun.getDate() + daysToAdd);
        break;

      case ScheduleFrequency.MONTHLY:
        // Планируем на указанный день месяца
        const dayOfMonth = scheduledReport.dayOfMonth ?? 1;
        nextRun.setDate(dayOfMonth);
        // Если день уже прошёл в этом месяце, планируем на следующий месяц
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        break;
    }

    return nextRun;
  }

  /**
   * Запуск запланированных отчётов (каждую минуту)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledReports(): Promise<void> {
    const now = new Date();
    
    // Находим все активные расписания, которые нужно запустить
    const reportsToRun = await this.scheduledReportsRepository.find({
      where: {
        isActive: true,
        nextRunAt: LessThanOrEqual(now),
      },
      relations: ['user'],
    });

    for (const scheduledReport of reportsToRun) {
      try {
        await this.executeScheduledReport(scheduledReport);
      } catch (error) {
        this.logger.error(
          `Failed to execute scheduled report ${scheduledReport.id}:`,
          error,
        );
      }
    }
  }

  /**
   * Выполнить запланированный отчёт
   */
  private async executeScheduledReport(scheduledReport: ScheduledReport): Promise<void> {
    this.logger.log(`Executing scheduled report: ${scheduledReport.id} - ${scheduledReport.name}`);

    // Генерируем отчёт
    const result = await this.reportsService.generateReport({
      type: scheduledReport.reportType,
      format: scheduledReport.format,
      startDate: scheduledReport.filters?.startDate,
      endDate: scheduledReport.filters?.endDate,
      fields: scheduledReport.fields,
      telegramChatId: scheduledReport.telegramChatId,
    });

    // Обновляем статистику
    scheduledReport.lastRunAt = new Date();
    scheduledReport.runCount += 1;
    scheduledReport.nextRunAt = this.calculateNextRun(scheduledReport);
    await this.scheduledReportsRepository.save(scheduledReport);

    this.logger.log(`✅ Scheduled report executed: ${scheduledReport.id}`);
  }
}

