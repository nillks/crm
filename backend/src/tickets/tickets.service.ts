import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { Comment } from '../entities/comment.entity';
import { TransferHistory } from '../entities/transfer-history.entity';
import { User } from '../entities/user.entity';
import {
  CreateTicketDto,
  UpdateTicketDto,
  FilterTicketsDto,
  UpdateStatusDto,
  TransferTicketDto,
  CreateCommentDto,
} from './dto';

export interface PaginatedTickets {
  data: Ticket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(TransferHistory)
    private transferHistoryRepository: Repository<TransferHistory>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Получить список тикетов с пагинацией и фильтрами
   */
  async findAll(filterDto: FilterTicketsDto, user: User): Promise<PaginatedTickets> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
      clientId,
      assignedToId,
      createdById,
      status,
      channel,
      include,
    } = filterDto;

    const skip = (page - 1) * limit;

    // Определяем связи для загрузки
    const relations: string[] = [];
    if (include) {
      const includes = include.split(',');
      if (includes.includes('client')) relations.push('client');
      if (includes.includes('createdBy')) relations.push('createdBy');
      if (includes.includes('assignedTo')) relations.push('assignedTo');
      if (includes.includes('comments')) relations.push('comments');
    }

    // Строим условия поиска
    const where: FindOptionsWhere<Ticket> = {};

    // Если указан общий поиск
    if (search) {
      where.title = ILike(`%${search}%`);
      // Можно также искать по описанию, но для простоты используем только title
    }

    if (clientId) where.clientId = clientId;
    if (assignedToId) where.assignedToId = assignedToId;
    if (createdById) where.createdById = createdById;
    if (status) where.status = status;
    if (channel) where.channel = channel;

    // Выполняем запрос
    const [data, total] = await this.ticketsRepository.findAndCount({
      where,
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
   * Получить тикет по ID
   */
  async findOne(id: string, include?: string): Promise<Ticket> {
    const relations: string[] = [];
    if (include) {
      const includes = include.split(',');
      if (includes.includes('client')) relations.push('client');
      if (includes.includes('createdBy')) relations.push('createdBy');
      if (includes.includes('assignedTo')) relations.push('assignedTo');
      if (includes.includes('comments')) {
        relations.push('comments');
        relations.push('comments.user');
      }
    }

    const ticket = await this.ticketsRepository.findOne({
      where: { id },
      relations,
    });

    if (!ticket) {
      throw new NotFoundException(`Тикет с ID ${id} не найден`);
    }

    return ticket;
  }

  /**
   * Создать новый тикет
   */
  async create(createTicketDto: CreateTicketDto, user: User): Promise<Ticket> {
    const ticket = this.ticketsRepository.create({
      ...createTicketDto,
      createdById: user.id,
      status: TicketStatus.NEW,
      priority: createTicketDto.priority || 0,
      dueDate: createTicketDto.dueDate ? new Date(createTicketDto.dueDate) : null,
    });

    return this.ticketsRepository.save(ticket);
  }

  /**
   * Обновить тикет
   */
  async update(id: string, updateTicketDto: UpdateTicketDto, user: User): Promise<Ticket> {
    const ticket = await this.findOne(id);

    // Проверяем права доступа (только создатель, назначенный оператор или админ)
    if (
      ticket.createdById !== user.id &&
      ticket.assignedToId !== user.id &&
      user.role?.name !== 'admin'
    ) {
      throw new ForbiddenException('Недостаточно прав для обновления этого тикета');
    }

    const updateData: any = { ...updateTicketDto };
    if (updateTicketDto.dueDate) {
      updateData.dueDate = new Date(updateTicketDto.dueDate);
    }

    Object.assign(ticket, updateData);
    return this.ticketsRepository.save(ticket);
  }

  /**
   * Изменить статус тикета
   */
  async updateStatus(
    id: string,
    updateStatusDto: UpdateStatusDto,
    user: User,
  ): Promise<Ticket> {
    const ticket = await this.findOne(id);

    const oldStatus = ticket.status;
    const newStatus = updateStatusDto.status;

    // Проверяем права доступа
    if (
      ticket.createdById !== user.id &&
      ticket.assignedToId !== user.id &&
      user.role?.name !== 'admin'
    ) {
      throw new ForbiddenException('Недостаточно прав для изменения статуса этого тикета');
    }

    // Обновляем статус
    ticket.status = newStatus;

    // Если статус меняется на закрыт, устанавливаем closedAt
    if (newStatus === TicketStatus.CLOSED && oldStatus !== TicketStatus.CLOSED) {
      ticket.closedAt = new Date();
    } else if (newStatus !== TicketStatus.CLOSED) {
      ticket.closedAt = null;
    }

    // Логируем изменение статуса в комментарии
    await this.commentsRepository.save(
      this.commentsRepository.create({
        ticketId: ticket.id,
        userId: user.id,
        content: `Статус изменен: ${this.getStatusLabel(oldStatus)} → ${this.getStatusLabel(newStatus)}`,
        isInternal: true,
      }),
    );

    return this.ticketsRepository.save(ticket);
  }

  /**
   * Передать тикет другому оператору
   */
  async transfer(id: string, transferDto: TransferTicketDto, user: User): Promise<Ticket> {
    const ticket = await this.findOne(id);

    // Проверяем права доступа
    if (
      ticket.createdById !== user.id &&
      ticket.assignedToId !== user.id &&
      user.role?.name !== 'admin'
    ) {
      throw new ForbiddenException('Недостаточно прав для передачи этого тикета');
    }

    // Проверяем, что целевой пользователь существует
    const toUser = await this.usersRepository.findOne({
      where: { id: transferDto.toUserId },
    });

    if (!toUser) {
      throw new NotFoundException(`Пользователь с ID ${transferDto.toUserId} не найден`);
    }

    // Создаем запись в истории передач
    await this.transferHistoryRepository.save(
      this.transferHistoryRepository.create({
        ticketId: ticket.id,
        fromUserId: user.id,
        toUserId: transferDto.toUserId,
        reason: transferDto.reason,
      }),
    );

    // Обновляем назначенного оператора
    ticket.assignedToId = transferDto.toUserId;

    // Создаем комментарий о передаче
    await this.commentsRepository.save(
      this.commentsRepository.create({
        ticketId: ticket.id,
        userId: user.id,
        content: `Тикет передан оператору ${toUser.name}${transferDto.reason ? `. Причина: ${transferDto.reason}` : ''}`,
        isInternal: true,
      }),
    );

    return this.ticketsRepository.save(ticket);
  }

  /**
   * Получить комментарии тикета
   */
  async getComments(ticketId: string): Promise<Comment[]> {
    const ticket = await this.findOne(ticketId);

    return this.commentsRepository.find({
      where: { ticketId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Добавить комментарий к тикету
   */
  async createComment(
    ticketId: string,
    createCommentDto: CreateCommentDto,
    user: User,
  ): Promise<Comment> {
    const ticket = await this.findOne(ticketId);

    const comment = this.commentsRepository.create({
      ...createCommentDto,
      ticketId: ticket.id,
      userId: user.id,
      isInternal: createCommentDto.isInternal || false,
    });

    return this.commentsRepository.save(comment);
  }

  /**
   * Получить текстовое представление статуса
   */
  private getStatusLabel(status: TicketStatus): string {
    const labels: Record<TicketStatus, string> = {
      [TicketStatus.NEW]: 'Новый',
      [TicketStatus.IN_PROGRESS]: 'В работе',
      [TicketStatus.CLOSED]: 'Закрыт',
      [TicketStatus.OVERDUE]: 'Просрочен',
    };
    return labels[status] || status;
  }
}

