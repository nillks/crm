import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike, Not } from 'typeorm';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { Comment } from '../entities/comment.entity';
import { TransferHistory } from '../entities/transfer-history.entity';
import { User } from '../entities/user.entity';
import { FunnelStage } from '../entities/funnel-stage.entity';
import { SupportLine } from '../entities/support-line.entity';
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
    @InjectRepository(FunnelStage)
    private funnelStagesRepository: Repository<FunnelStage>,
    @InjectRepository(SupportLine)
    private supportLinesRepository: Repository<SupportLine>,
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
      category,
      funnelStageId,
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
    if (category) where.category = category;
    if (funnelStageId) where.funnelStageId = funnelStageId;

    // Фильтрация по линии: операторы видят только тикеты своей линии
    // Администратор видит все тикеты
    if (user.role?.name !== 'admin' && user.role?.name) {
      // Находим всех операторов той же линии
      const operatorsSameLine = await this.usersRepository.find({
        where: {
          role: { name: user.role.name },
        },
        select: ['id'],
      });

      const operatorIds = operatorsSameLine.map((op) => op.id);

      // Оператор видит тикеты, назначенные на операторов его линии, или созданные им
      // Используем QueryBuilder для более сложного условия
      const queryBuilder = this.ticketsRepository
        .createQueryBuilder('ticket')
        .leftJoinAndSelect('ticket.client', 'client')
        .leftJoinAndSelect('ticket.createdBy', 'createdBy')
        .leftJoinAndSelect('ticket.assignedTo', 'assignedTo')
        .where('(ticket.assignedToId IN (:...operatorIds) OR ticket.createdById = :userId)', {
          operatorIds,
          userId: user.id,
        });

      // Применяем дополнительные фильтры
      if (clientId) queryBuilder.andWhere('ticket.clientId = :clientId', { clientId });
      if (assignedToId) queryBuilder.andWhere('ticket.assignedToId = :assignedToId', { assignedToId });
      if (createdById) queryBuilder.andWhere('ticket.createdById = :createdById', { createdById });
      if (status) queryBuilder.andWhere('ticket.status = :status', { status });
      if (channel) queryBuilder.andWhere('ticket.channel = :channel', { channel });
      if (category) queryBuilder.andWhere('ticket.category = :category', { category });
      if (funnelStageId) queryBuilder.andWhere('ticket.funnelStageId = :funnelStageId', { funnelStageId });
      if (search) queryBuilder.andWhere('ticket.title ILIKE :search', { search: `%${search}%` });

      // Сортировка
      queryBuilder.orderBy(`ticket.${sortBy}`, sortOrder);

      // Пагинация
      queryBuilder.skip(skip).take(limit);

      // Загружаем дополнительные связи
      if (relations.includes('comments')) {
        queryBuilder.leftJoinAndSelect('ticket.comments', 'comments');
      }

      const [data, total] = await queryBuilder.getManyAndCount();

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    // Для администратора - обычный запрос
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
   * Получить тикет по ID с проверкой прав доступа
   */
  async findOne(id: string, include?: string, user?: User): Promise<Ticket> {
    const relations: string[] = [];
    if (include) {
      const includes = include.split(',');
      if (includes.includes('client')) relations.push('client');
      if (includes.includes('createdBy')) {
        relations.push('createdBy');
        relations.push('createdBy.supportLine');
      }
      if (includes.includes('assignedTo')) relations.push('assignedTo');
      if (includes.includes('comments')) {
        relations.push('comments');
        relations.push('comments.user');
      }
    } else {
      // По умолчанию загружаем createdBy для autoAssignTicket
      relations.push('createdBy');
      relations.push('createdBy.supportLine');
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
    // Автоматическая классификация тикета, если категория не указана
    let category = createTicketDto.category;
    let priority = createTicketDto.priority || 0;

    if (!category && createTicketDto.description) {
      category = await this.classifyTicket(createTicketDto.description, createTicketDto.title);
    }

    // Автоматическое определение приоритета на основе категории и текста
    if (!createTicketDto.priority && createTicketDto.description) {
      priority = await this.determinePriority(createTicketDto.description, category);
    }

    const ticket = this.ticketsRepository.create({
      ...createTicketDto,
      category: category || createTicketDto.category,
      priority,
      createdById: user.id,
      status: TicketStatus.NEW,
      dueDate: createTicketDto.dueDate ? new Date(createTicketDto.dueDate) : null,
    });

    const savedTicket = await this.ticketsRepository.save(ticket);

    // Автоматическое распределение тикета, если не указан assignedToId
    if (!savedTicket.assignedToId) {
      await this.autoAssignTicket(savedTicket);
    }

    return savedTicket;
  }

  /**
   * Автоматическая классификация тикета по тексту
   */
  private async classifyTicket(description: string, title?: string): Promise<string | undefined> {
    const text = `${title || ''} ${description}`.toLowerCase();

    // Простая классификация на основе ключевых слов
    // В будущем можно использовать AI для более точной классификации
    if (text.includes('жалоб') || text.includes('проблем') || text.includes('не работает')) {
      return 'complaint';
    }
    if (text.includes('купить') || text.includes('цена') || text.includes('стоимость') || text.includes('заказ')) {
      return 'sales';
    }
    if (text.includes('вопрос') || text.includes('как') || text.includes('что')) {
      return 'question';
    }
    if (text.includes('запрос') || text.includes('нужно') || text.includes('требуется')) {
      return 'request';
    }
    if (text.includes('техническ') || text.includes('ошибк') || text.includes('баг')) {
      return 'technical';
    }

    return 'other';
  }

  /**
   * Определение приоритета тикета
   */
  private async determinePriority(description: string, category?: string): Promise<number> {
    const text = description.toLowerCase();

    // Высокий приоритет (4-5)
    if (text.includes('срочно') || text.includes('критично') || text.includes('не работает') || category === 'complaint') {
      return 5;
    }

    // Средний приоритет (2-3)
    if (text.includes('важно') || category === 'sales' || category === 'request') {
      return 3;
    }

    // Низкий приоритет (0-1)
    if (category === 'question' || category === 'other') {
      return 1;
    }

    return 0;
  }

  /**
   * Автоматическое распределение тикета на оператора
   */
  async autoAssignTicket(ticket: Ticket): Promise<Ticket> {
    // Если тикет уже назначен, не делаем ничего
    if (ticket.assignedToId) {
      return ticket;
    }

    // Определяем линию поддержки на основе канала или категории
    let targetLine: SupportLine | null = null;

    // Если у пользователя есть линия, используем её
    if (ticket.createdBy?.supportLineId) {
      targetLine = await this.supportLinesRepository.findOne({
        where: { id: ticket.createdBy.supportLineId },
      });
    }

    // Если линия не найдена, выбираем по умолчанию на основе канала
    if (!targetLine) {
      // Можно настроить привязку каналов к линиям
      // Пока используем первую активную линию
      targetLine = await this.supportLinesRepository.findOne({
        where: { isActive: true },
        order: { code: 'ASC' },
      });
    }

    if (!targetLine || !targetLine.settings?.autoAssign) {
      return ticket;
    }

    // Получаем доступного оператора линии
    const operators = await this.usersRepository.find({
      where: {
        supportLineId: targetLine.id,
        status: 'active',
      },
      relations: ['role'],
    });

    if (operators.length === 0) {
      return ticket;
    }

    // Round-robin: выбираем оператора с наименьшим количеством активных тикетов
    let selectedOperator = operators[0];
    let minTickets = Infinity;

    for (const operator of operators) {
      const activeTicketsCount = await this.ticketsRepository.count({
        where: {
          assignedToId: operator.id,
          status: Not(TicketStatus.CLOSED),
        },
      });

      if (activeTicketsCount < minTickets) {
        minTickets = activeTicketsCount;
        selectedOperator = operator;
      }
    }

    ticket.assignedToId = selectedOperator.id;
    ticket.supportLineId = targetLine.id;

    // Создаем комментарий о автоматическом назначении
    await this.commentsRepository.save(
      this.commentsRepository.create({
        ticketId: ticket.id,
        userId: ticket.createdById,
        content: `Тикет автоматически назначен на оператора ${selectedOperator.name} (${targetLine.name})`,
        isInternal: true,
      }),
    );

    return this.ticketsRepository.save(ticket);
  }

  /**
   * Обновить тикет
   */
  async update(id: string, updateTicketDto: UpdateTicketDto, user: User): Promise<Ticket> {
    const ticket = await this.findOne(id, undefined, user);

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
    const ticket = await this.findOne(id, undefined, user);

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
   * Передать тикет другому оператору или на линию
   */
  async transfer(id: string, transferDto: TransferTicketDto, user: User): Promise<Ticket> {
    const ticket = await this.findOne(id, undefined, user);

    // Проверяем права доступа
    if (
      ticket.createdById !== user.id &&
      ticket.assignedToId !== user.id &&
      user.role?.name !== 'admin'
    ) {
      throw new ForbiddenException('Недостаточно прав для передачи этого тикета');
    }

    let toUser: User | null = null;
    let transferDescription = '';

    // Если указан конкретный пользователь
    if (transferDto.toUserId) {
      toUser = await this.usersRepository.findOne({
        where: { id: transferDto.toUserId },
        relations: ['role'],
      });

      if (!toUser) {
        throw new NotFoundException(`Пользователь с ID ${transferDto.toUserId} не найден`);
      }

      transferDescription = `оператору ${toUser.name} (${toUser.email})`;
    }
    // Если указана линия (роль)
    else if (transferDto.toRoleName) {
      // Находим первого доступного оператора этой линии
      const operators = await this.usersRepository.find({
        where: {
          role: { name: transferDto.toRoleName },
        },
        relations: ['role'],
      });

      if (operators.length === 0) {
        throw new NotFoundException(`Нет доступных операторов для линии ${transferDto.toRoleName}`);
      }

      // Выбираем первого оператора (можно улучшить логику выбора)
      toUser = operators[0];
      
      const roleLabels: Record<string, string> = {
        operator1: 'линии №1',
        operator2: 'линии №2',
        operator3: 'линии №3',
      };
      
      transferDescription = `на ${roleLabels[transferDto.toRoleName] || transferDto.toRoleName} (${toUser.name}${toUser.surname ? ` ${toUser.surname}` : ''})`;
    } else {
      throw new BadRequestException('Необходимо указать либо toUserId, либо toRoleName');
    }

    // Создаем запись в истории передач
    await this.transferHistoryRepository.save(
      this.transferHistoryRepository.create({
        ticketId: ticket.id,
        fromUserId: user.id,
        toUserId: toUser.id,
        reason: transferDto.reason,
      }),
    );

    // Обновляем назначенного оператора
    ticket.assignedToId = toUser.id;

    // Создаем комментарий о передаче
    await this.commentsRepository.save(
      this.commentsRepository.create({
        ticketId: ticket.id,
        userId: user.id,
        content: `Тикет передан ${transferDescription}${transferDto.reason ? `. Причина: ${transferDto.reason}` : ''}`,
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
    const ticket = await this.findOne(ticketId, undefined, user);

    const comment = this.commentsRepository.create({
      ...createCommentDto,
      ticketId: ticket.id,
      userId: user.id,
      isInternal: createCommentDto.isInternal || false,
    });

    return this.commentsRepository.save(comment);
  }

  /**
   * Переместить тикет на следующий этап воронки
   */
  async moveToNextStage(ticketId: string, user: User): Promise<Ticket> {
    const ticket = await this.findOne(ticketId, undefined, user);

    // Проверяем права доступа
    if (
      ticket.createdById !== user.id &&
      ticket.assignedToId !== user.id &&
      user.role?.name !== 'admin'
    ) {
      throw new ForbiddenException('Недостаточно прав для перемещения этого тикета');
    }

    if (!ticket.funnelStageId) {
      throw new BadRequestException('Тикет не находится в воронке');
    }

    const currentStage = await this.funnelStagesRepository.findOne({
      where: { id: ticket.funnelStageId },
      relations: ['funnel'],
    });

    if (!currentStage) {
      throw new NotFoundException('Текущий этап воронки не найден');
    }

    // Находим следующий этап в той же воронке
    const nextStage = await this.funnelStagesRepository.findOne({
      where: {
        funnelId: currentStage.funnelId,
        order: currentStage.order + 1,
        isActive: true,
      },
      order: { order: 'ASC' },
    });

    if (!nextStage) {
      throw new BadRequestException('Следующий этап не найден');
    }

    // Обновляем тикет
    ticket.funnelStageId = nextStage.id;

    // Если этап финальный, закрываем тикет
    if (nextStage.isFinal) {
      ticket.status = TicketStatus.CLOSED;
      ticket.closedAt = new Date();
    } else if (nextStage.ticketStatus) {
      // Обновляем статус тикета согласно настройкам этапа
      ticket.status = nextStage.ticketStatus as TicketStatus;
    }

    return this.ticketsRepository.save(ticket);
  }

  /**
   * Переместить тикет на конкретный этап воронки
   */
  async moveToStage(ticketId: string, stageId: string, user: User): Promise<Ticket> {
    const ticket = await this.findOne(ticketId, undefined, user);

    // Проверяем права доступа
    if (
      ticket.createdById !== user.id &&
      ticket.assignedToId !== user.id &&
      user.role?.name !== 'admin'
    ) {
      throw new ForbiddenException('Недостаточно прав для перемещения этого тикета');
    }

    const stage = await this.funnelStagesRepository.findOne({
      where: { id: stageId, isActive: true },
    });

    if (!stage) {
      throw new NotFoundException('Этап воронки не найден');
    }

    ticket.funnelStageId = stage.id;

    // Если этап финальный, закрываем тикет
    if (stage.isFinal) {
      ticket.status = TicketStatus.CLOSED;
      ticket.closedAt = new Date();
    } else if (stage.ticketStatus) {
      ticket.status = stage.ticketStatus as TicketStatus;
    }

    return this.ticketsRepository.save(ticket);
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

