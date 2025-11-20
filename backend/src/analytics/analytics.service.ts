import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not } from 'typeorm';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { Message, MessageDirection } from '../entities/message.entity';
import { Call, CallStatus } from '../entities/call.entity';
import { Task, TaskStatus } from '../entities/task.entity';
import { User } from '../entities/user.entity';
import { SLAMetricsDto } from './dto/sla-metrics.dto';
import { KPIMetricsDto } from './dto/kpi-metrics.dto';
import { ChannelAnalyticsDto } from './dto/channel-analytics.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(Call)
    private callsRepository: Repository<Call>,
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Расчёт SLA метрик
   */
  async calculateSLA(startDate?: Date, endDate?: Date): Promise<SLAMetricsDto> {
    const period = this.getPeriod(startDate, endDate);

    // Получаем закрытые тикеты за период
    const closedTickets = await this.ticketsRepository
      .createQueryBuilder('ticket')
      .where('ticket.status = :status', { status: TicketStatus.CLOSED })
      .andWhere('ticket.closedAt IS NOT NULL')
      .andWhere('ticket.closedAt >= :startDate', { startDate: period.startDate })
      .andWhere('ticket.closedAt <= :endDate', { endDate: period.endDate })
      .getMany();

    // Расчёт времени обработки тикетов
    const resolutionTimes = closedTickets
      .filter((t) => t.closedAt && t.createdAt)
      .map((t) => {
        const diff = t.closedAt!.getTime() - t.createdAt.getTime();
        return diff / (1000 * 60 * 60); // конвертируем в часы
      })
      .filter((time) => time >= 0);

    const averageResolutionTime =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
        : 0;

    const medianResolutionTime = this.calculateMedian(resolutionTimes);

    // Расчёт процента тикетов, закрытых в срок
    const onTimeClosedTickets = closedTickets.filter((ticket) => {
      if (!ticket.dueDate || !ticket.closedAt) return false;
      return ticket.closedAt <= ticket.dueDate;
    }).length;

    const onTimeClosureRate =
      closedTickets.length > 0 ? (onTimeClosedTickets / closedTickets.length) * 100 : 0;

    // Расчёт среднего времени ответа
    const responseTimes = await this.calculateResponseTimes(period.startDate, period.endDate);
    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

    const medianResponseTime = this.calculateMedian(responseTimes);

    return {
      averageResolutionTime: Math.round(averageResolutionTime * 100) / 100,
      medianResolutionTime: Math.round(medianResolutionTime * 100) / 100,
      onTimeClosureRate: Math.round(onTimeClosureRate * 100) / 100,
      totalClosedTickets: closedTickets.length,
      onTimeClosedTickets,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      medianResponseTime: Math.round(medianResponseTime * 100) / 100,
      period,
    };
  }

  /**
   * Расчёт KPI метрик
   */
  async calculateKPI(startDate?: Date, endDate?: Date): Promise<KPIMetricsDto> {
    const period = this.getPeriod(startDate, endDate);

    // Количество непринятых звонков
    const missedCalls = await this.callsRepository.count({
      where: {
        status: CallStatus.MISSED,
        createdAt: Between(period.startDate, period.endDate),
      },
    });

    // Количество непрочитанных входящих сообщений
    const unreadMessages = await this.messagesRepository.count({
      where: {
        direction: MessageDirection.INBOUND,
        isRead: false,
        createdAt: Between(period.startDate, period.endDate),
      },
    });

    // Количество просроченных задач
    const now = new Date();
    const overdueTasks = await this.tasksRepository
      .createQueryBuilder('task')
      .where('task.dueDate IS NOT NULL')
      .andWhere('task.dueDate <= :now', { now })
      .andWhere('task.status != :completed', { completed: TaskStatus.COMPLETED })
      .andWhere('task.status != :cancelled', { cancelled: TaskStatus.CANCELLED })
      .getCount();

    // Статистика по тикетам
    const activeTickets = await this.ticketsRepository.count({
      where: {
        status: Not(TicketStatus.CLOSED),
      },
    });

    const newTickets = await this.ticketsRepository.count({
      where: {
        status: TicketStatus.NEW,
      },
    });

    const inProgressTickets = await this.ticketsRepository.count({
      where: {
        status: TicketStatus.IN_PROGRESS,
      },
    });

    const overdueTickets = await this.ticketsRepository.count({
      where: {
        status: TicketStatus.OVERDUE,
      },
    });

    return {
      missedCalls,
      unreadMessages,
      overdueTasks,
      activeTickets,
      newTickets,
      inProgressTickets,
      overdueTickets,
      period,
    };
  }

  /**
   * Расчёт KPI по операторам
   */
  async calculateOperatorKPI(startDate?: Date, endDate?: Date): Promise<Array<{
    operatorId: string;
    operatorName: string;
    operatorEmail: string;
    role: string;
    ticketsCreated: number;
    ticketsAssigned: number;
    ticketsClosed: number;
    averageResolutionTime: number;
    messagesSent: number;
    callsHandled: number;
  }>> {
    const period = this.getPeriod(startDate, endDate);

    // Получаем всех операторов
    const users = await this.usersRepository.find({
      relations: ['role'],
      where: {
        role: {
          name: Not('admin'),
        },
      },
    });

    const operatorKPIs = await Promise.all(
      users.map(async (user) => {
        const operatorId = user.id;

        // Тикеты созданные
        const ticketsCreated = await this.ticketsRepository.count({
          where: {
            createdById: operatorId,
            createdAt: Between(period.startDate, period.endDate),
          },
        });

        // Тикеты назначенные
        const ticketsAssigned = await this.ticketsRepository.count({
          where: {
            assignedToId: operatorId,
            createdAt: Between(period.startDate, period.endDate),
          },
        });

        // Тикеты закрытые
        const ticketsClosed = await this.ticketsRepository.count({
          where: {
            assignedToId: operatorId,
            status: TicketStatus.CLOSED,
            closedAt: Between(period.startDate, period.endDate),
          },
        });

        // Среднее время решения
        const closedTickets = await this.ticketsRepository.find({
          where: {
            assignedToId: operatorId,
            status: TicketStatus.CLOSED,
            closedAt: Between(period.startDate, period.endDate),
          },
        });

        const resolutionTimes = closedTickets
          .filter((t) => t.closedAt && t.createdAt)
          .map((t) => {
            const diff = t.closedAt!.getTime() - t.createdAt.getTime();
            return diff / (1000 * 60 * 60); // конвертируем в часы
          })
          .filter((time) => time >= 0);

        const averageResolutionTime =
          resolutionTimes.length > 0
            ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
            : 0;

        // Сообщения отправленные
        const messagesSent = await this.messagesRepository.count({
          where: {
            userId: operatorId,
            direction: MessageDirection.OUTBOUND,
            createdAt: Between(period.startDate, period.endDate),
          },
        });

        // Звонки обработанные
        const callsHandled = await this.callsRepository.count({
          where: {
            operatorId: operatorId,
            startedAt: Between(period.startDate, period.endDate),
          },
        });

        return {
          operatorId,
          operatorName: user.name || 'N/A',
          operatorEmail: user.email || 'N/A',
          role: user.role?.name || 'N/A',
          ticketsCreated,
          ticketsAssigned,
          ticketsClosed,
          averageResolutionTime: Math.round(averageResolutionTime * 100) / 100,
          messagesSent,
          callsHandled,
        };
      }),
    );

    return operatorKPIs;
  }

  /**
   * Аналитика по каналам
   */
  async getChannelAnalytics(startDate?: Date, endDate?: Date): Promise<ChannelAnalyticsDto> {
    const period = this.getPeriod(startDate, endDate);

    const channels = ['whatsapp', 'telegram', 'instagram', 'call'];

    const channelData = await Promise.all(
      channels.map(async (channel) => {
        // Тикеты по каналу
        const tickets = await this.ticketsRepository
          .createQueryBuilder('ticket')
          .where('ticket.channel = :channel', { channel })
          .andWhere('ticket.createdAt >= :startDate', { startDate: period.startDate })
          .andWhere('ticket.createdAt <= :endDate', { endDate: period.endDate })
          .getMany();

        const closedTickets = tickets.filter((t) => t.status === TicketStatus.CLOSED && t.closedAt);

        // Среднее время обработки
        const resolutionTimes = closedTickets
          .filter((t) => t.closedAt && t.createdAt)
          .map((t) => {
            const diff = t.closedAt!.getTime() - t.createdAt.getTime();
            return diff / (1000 * 60 * 60); // часы
          })
          .filter((time) => time >= 0);

        const averageResolutionTime =
          resolutionTimes.length > 0
            ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
            : 0;

        // Сообщения по каналу
        const messages = await this.messagesRepository
          .createQueryBuilder('message')
          .where('message.channel = :channel', { channel })
          .andWhere('message.createdAt >= :startDate', { startDate: period.startDate })
          .andWhere('message.createdAt <= :endDate', { endDate: period.endDate })
          .getMany();

        const unreadMessages = messages.filter(
          (m) => m.direction === MessageDirection.INBOUND && !m.isRead,
        ).length;

        // Среднее время ответа для канала
        const responseTimes = await this.calculateResponseTimes(
          period.startDate,
          period.endDate,
          channel,
        );
        const averageResponseTime =
          responseTimes.length > 0
            ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
            : 0;

        return {
          channel,
          totalTickets: tickets.length,
          closedTickets: closedTickets.length,
          averageResolutionTime: Math.round(averageResolutionTime * 100) / 100,
          averageResponseTime: Math.round(averageResponseTime * 100) / 100,
          totalMessages: messages.length,
          unreadMessages,
        };
      }),
    );

    // Общая статистика
    const allTickets = await this.ticketsRepository
      .createQueryBuilder('ticket')
      .where('ticket.createdAt >= :startDate', { startDate: period.startDate })
      .andWhere('ticket.createdAt <= :endDate', { endDate: period.endDate })
      .getMany();

    const allMessages = await this.messagesRepository
      .createQueryBuilder('message')
      .where('message.createdAt >= :startDate', { startDate: period.startDate })
      .andWhere('message.createdAt <= :endDate', { endDate: period.endDate })
      .getMany();

    const allUnreadMessages = allMessages.filter(
      (m) => m.direction === MessageDirection.INBOUND && !m.isRead,
    ).length;

    const allClosedTickets = allTickets.filter(
      (t) => t.status === TicketStatus.CLOSED && t.closedAt,
    );

    const allResolutionTimes = allClosedTickets
      .filter((t) => t.closedAt && t.createdAt)
      .map((t) => {
        const diff = t.closedAt!.getTime() - t.createdAt.getTime();
        return diff / (1000 * 60 * 60);
      })
      .filter((time) => time >= 0);

    const allAverageResolutionTime =
      allResolutionTimes.length > 0
        ? allResolutionTimes.reduce((sum, time) => sum + time, 0) / allResolutionTimes.length
        : 0;

    const allResponseTimes = await this.calculateResponseTimes(period.startDate, period.endDate);
    const allAverageResponseTime =
      allResponseTimes.length > 0
        ? allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length
        : 0;

    return {
      channels: channelData,
      summary: {
        totalTickets: allTickets.length,
        totalMessages: allMessages.length,
        totalUnreadMessages: allUnreadMessages,
        averageResolutionTime: Math.round(allAverageResolutionTime * 100) / 100,
        averageResponseTime: Math.round(allAverageResponseTime * 100) / 100,
      },
      period,
    };
  }

  /**
   * Расчёт времени ответа на сообщения
   */
  private async calculateResponseTimes(
    startDate: Date,
    endDate: Date,
    channel?: string,
  ): Promise<number[]> {
    // Получаем все входящие сообщения за период
    const inboundQuery = this.messagesRepository
      .createQueryBuilder('message')
      .where('message.direction = :direction', { direction: MessageDirection.INBOUND })
      .andWhere('message.createdAt >= :startDate', { startDate })
      .andWhere('message.createdAt <= :endDate', { endDate });

    if (channel) {
      inboundQuery.andWhere('message.channel = :channel', { channel });
    }

    const inboundMessages = await inboundQuery
      .orderBy('message.createdAt', 'ASC')
      .getMany();

    const responseTimes: number[] = [];

    // Для каждого входящего сообщения ищем первый исходящий ответ
    for (const inboundMessage of inboundMessages) {
      if (!inboundMessage.ticketId) continue;

      // Ищем первое исходящее сообщение после входящего в том же тикете
      const outboundMessage = await this.messagesRepository
        .createQueryBuilder('message')
        .where('message.ticketId = :ticketId', { ticketId: inboundMessage.ticketId })
        .andWhere('message.direction = :direction', { direction: MessageDirection.OUTBOUND })
        .andWhere('message.createdAt > :inboundTime', {
          inboundTime: inboundMessage.createdAt,
        })
        .orderBy('message.createdAt', 'ASC')
        .limit(1)
        .getOne();

      if (outboundMessage) {
        const diff = outboundMessage.createdAt.getTime() - inboundMessage.createdAt.getTime();
        const minutes = diff / (1000 * 60);
        if (minutes >= 0 && minutes < 10080) {
          // Фильтруем нереалистичные значения (больше недели)
          responseTimes.push(minutes);
        }
      }
    }

    return responseTimes;
  }

  /**
   * Расчёт медианы
   */
  private calculateMedian(numbers: number[]): number {
    if (numbers.length === 0) return 0;

    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
  }

  /**
   * Получить период для расчёта
   */
  private getPeriod(startDate?: Date, endDate?: Date): { startDate: Date; endDate: Date } {
    const now = new Date();
    const defaultStartDate = new Date(now);
    defaultStartDate.setDate(defaultStartDate.getDate() - 30); // Последние 30 дней

    return {
      startDate: startDate || defaultStartDate,
      endDate: endDate || now,
    };
  }
}

