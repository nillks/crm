import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Between, In } from 'typeorm';
import { Task, TaskStatus, TaskPriority } from '../entities/task.entity';
import { Client } from '../entities/client.entity';
import { User } from '../entities/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FilterTasksDto } from './dto/filter-tasks.dto';

@Injectable()
export class TasksService implements OnModuleInit {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    // Запускаем проверку просроченных задач
    this.startOverdueCheck();
    // Запускаем уведомления о приближающихся сроках
    this.startUpcomingDeadlineNotifications();
  }

  /**
   * Создать задачу
   */
  async create(createTaskDto: CreateTaskDto, createdById: string): Promise<Task> {
    // Проверка клиента
    const client = await this.clientsRepository.findOne({ where: { id: createTaskDto.clientId } });
    if (!client) {
      throw new NotFoundException(`Клиент с ID ${createTaskDto.clientId} не найден`);
    }

    // Проверка исполнителя
    const assignedTo = await this.usersRepository.findOne({
      where: { id: createTaskDto.assignedToId },
    });
    if (!assignedTo) {
      throw new NotFoundException(`Пользователь с ID ${createTaskDto.assignedToId} не найден`);
    }

    const task = this.tasksRepository.create({
      ...createTaskDto,
      dueDate: createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : null,
      status: createTaskDto.status || TaskStatus.PENDING,
      priority: createTaskDto.priority || TaskPriority.MEDIUM,
    });

    const savedTask = await this.tasksRepository.save(task);
    this.logger.log(`✅ Task created: ${savedTask.id} - ${savedTask.title}`);

    return savedTask;
  }

  /**
   * Получить все задачи с фильтрами
   */
  async findAll(filterDto: FilterTasksDto): Promise<{ tasks: Task[]; total: number }> {
    const queryBuilder = this.tasksRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.client', 'client')
      .leftJoinAndSelect('task.assignedTo', 'assignedTo');

    if (filterDto.clientId) {
      queryBuilder.andWhere('task.clientId = :clientId', { clientId: filterDto.clientId });
    }

    if (filterDto.assignedToId) {
      queryBuilder.andWhere('task.assignedToId = :assignedToId', {
        assignedToId: filterDto.assignedToId,
      });
    }

    if (filterDto.status) {
      queryBuilder.andWhere('task.status = :status', { status: filterDto.status });
    }

    if (filterDto.priority) {
      queryBuilder.andWhere('task.priority = :priority', { priority: filterDto.priority });
    }

    if (filterDto.category) {
      queryBuilder.andWhere('task.category = :category', { category: filterDto.category });
    }

    if (filterDto.startDate && filterDto.endDate) {
      queryBuilder.andWhere('task.dueDate BETWEEN :startDate AND :endDate', {
        startDate: new Date(filterDto.startDate),
        endDate: new Date(filterDto.endDate),
      });
    } else if (filterDto.startDate) {
      queryBuilder.andWhere('task.dueDate >= :startDate', {
        startDate: new Date(filterDto.startDate),
      });
    } else if (filterDto.endDate) {
      queryBuilder.andWhere('task.dueDate <= :endDate', {
        endDate: new Date(filterDto.endDate),
      });
    }

    const total = await queryBuilder.getCount();

    const tasks = await queryBuilder
      .orderBy('task.dueDate', 'ASC')
      .addOrderBy('task.priority', 'DESC')
      .addOrderBy('task.createdAt', 'DESC')
      .skip((filterDto.page || 0) * (filterDto.limit || 20))
      .take(filterDto.limit || 20)
      .getMany();

    return { tasks, total };
  }

  /**
   * Получить задачу по ID
   */
  async findOne(id: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['client', 'assignedTo'],
    });

    if (!task) {
      throw new NotFoundException(`Задача с ID ${id} не найдена`);
    }

    return task;
  }

  /**
   * Обновить задачу
   */
  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOne(id);

    if (updateTaskDto.clientId) {
      const client = await this.clientsRepository.findOne({
        where: { id: updateTaskDto.clientId },
      });
      if (!client) {
        throw new NotFoundException(`Клиент с ID ${updateTaskDto.clientId} не найден`);
      }
    }

    if (updateTaskDto.assignedToId) {
      const assignedTo = await this.usersRepository.findOne({
        where: { id: updateTaskDto.assignedToId },
      });
      if (!assignedTo) {
        throw new NotFoundException(`Пользователь с ID ${updateTaskDto.assignedToId} не найден`);
      }
    }

    // Если статус меняется на COMPLETED, устанавливаем completedAt
    if (updateTaskDto.status === TaskStatus.COMPLETED && task.status !== TaskStatus.COMPLETED) {
      updateTaskDto['completedAt'] = new Date();
    } else if (updateTaskDto.status !== TaskStatus.COMPLETED && task.status === TaskStatus.COMPLETED) {
      updateTaskDto['completedAt'] = null;
    }

    Object.assign(task, {
      ...updateTaskDto,
      dueDate: updateTaskDto.dueDate ? new Date(updateTaskDto.dueDate) : task.dueDate,
    });

    const updatedTask = await this.tasksRepository.save(task);
    this.logger.log(`✅ Task updated: ${updatedTask.id} - ${updatedTask.title}`);

    return updatedTask;
  }

  /**
   * Удалить задачу
   */
  async remove(id: string): Promise<void> {
    const task = await this.findOne(id);
    await this.tasksRepository.remove(task);
    this.logger.log(`🗑️ Task deleted: ${id}`);
  }

  /**
   * Получить задачи по клиенту
   */
  async findByClient(clientId: string): Promise<Task[]> {
    return this.tasksRepository.find({
      where: { clientId },
      relations: ['assignedTo'],
      order: { dueDate: 'ASC', priority: 'DESC' },
    });
  }

  /**
   * Получить задачи по исполнителю
   */
  async findByAssignee(assignedToId: string): Promise<Task[]> {
    return this.tasksRepository.find({
      where: { assignedToId },
      relations: ['client'],
      order: { dueDate: 'ASC', priority: 'DESC' },
    });
  }

  /**
   * Получить задачи с приближающимися сроками (в течение 24 часов)
   */
  async getUpcomingTasks(hours: number = 24): Promise<Task[]> {
    const now = new Date();
    const deadline = new Date(now.getTime() + hours * 60 * 60 * 1000);

    return this.tasksRepository.find({
      where: {
        status: In([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
        dueDate: Between(now, deadline),
      },
      relations: ['client', 'assignedTo'],
      order: { dueDate: 'ASC', priority: 'DESC' },
    });
  }

  /**
   * Получить просроченные задачи
   */
  async getOverdueTasks(): Promise<Task[]> {
    const now = new Date();

    return this.tasksRepository.find({
      where: {
        status: In([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
        dueDate: LessThanOrEqual(now),
      },
      relations: ['client', 'assignedTo'],
      order: { dueDate: 'ASC', priority: 'DESC' },
    });
  }

  /**
   * Обновить статус просроченных задач
   */
  private async updateOverdueTasks(): Promise<void> {
    const overdueTasks = await this.getOverdueTasks();

    for (const task of overdueTasks) {
      if (task.status !== TaskStatus.OVERDUE) {
        task.status = TaskStatus.OVERDUE;
        await this.tasksRepository.save(task);
        this.logger.warn(`⚠️ Task marked as overdue: ${task.id} - ${task.title}`);
      }
    }

    if (overdueTasks.length > 0) {
      this.logger.log(`🔄 Updated ${overdueTasks.length} overdue tasks`);
    }
  }

  /**
   * Запустить периодическую проверку просроченных задач
   */
  private startOverdueCheck(): void {
    // Проверяем каждые 6 часов
    setInterval(() => {
      this.updateOverdueTasks();
    }, 6 * 60 * 60 * 1000);

    // Первая проверка через 1 час
    setTimeout(() => {
      this.updateOverdueTasks();
    }, 60 * 60 * 1000);

    this.logger.log('🔄 Overdue tasks check scheduled');
  }

  /**
   * Запустить уведомления о приближающихся сроках
   */
  private startUpcomingDeadlineNotifications(): void {
    // Проверяем каждые 2 часа
    setInterval(() => {
      this.checkUpcomingDeadlines();
    }, 2 * 60 * 60 * 1000);

    // Первая проверка через 30 минут
    setTimeout(() => {
      this.checkUpcomingDeadlines();
    }, 30 * 60 * 1000);

    this.logger.log('🔔 Upcoming deadline notifications scheduled');
  }

  /**
   * Проверить приближающиеся сроки и залогировать
   */
  private async checkUpcomingDeadlines(): Promise<void> {
    const upcomingTasks = await this.getUpcomingTasks(24);

    if (upcomingTasks.length > 0) {
      this.logger.warn(
        `🔔 Found ${upcomingTasks.length} tasks with upcoming deadlines (within 24 hours)`,
      );
      for (const task of upcomingTasks) {
        const hoursUntilDeadline = Math.round(
          (task.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60),
        );
        this.logger.warn(
          `  - Task "${task.title}" (${task.id}) due in ${hoursUntilDeadline} hours (Assigned to: ${task.assignedTo?.email || 'N/A'})`,
        );
      }
    }
  }
}

