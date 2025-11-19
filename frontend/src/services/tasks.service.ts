import api from './api';

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue',
}

export enum TaskPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  URGENT = 4,
  CRITICAL = 5,
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  clientId: string;
  assignedToId: string;
  status: TaskStatus;
  priority: TaskPriority;
  category?: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    name: string;
  };
  assignedTo?: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  clientId: string;
  assignedToId: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  dueDate?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  clientId?: string;
  assignedToId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  dueDate?: string;
}

export interface FilterTasksDto {
  clientId?: string;
  assignedToId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  page?: number;
}

export interface TasksResponse {
  tasks: Task[];
  total: number;
}

class TasksService {
  /**
   * Создать задачу
   */
  async create(dto: CreateTaskDto): Promise<Task> {
    const response = await api.post<Task>('/tasks', dto);
    return response.data;
  }

  /**
   * Получить все задачи с фильтрами
   */
  async findAll(filterDto: FilterTasksDto = {}): Promise<TasksResponse> {
    const response = await api.get<TasksResponse>('/tasks', { params: filterDto });
    return response.data;
  }

  /**
   * Получить задачу по ID
   */
  async findOne(id: string): Promise<Task> {
    const response = await api.get<Task>(`/tasks/${id}`);
    return response.data;
  }

  /**
   * Обновить задачу
   */
  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    const response = await api.put<Task>(`/tasks/${id}`, dto);
    return response.data;
  }

  /**
   * Удалить задачу
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`);
  }

  /**
   * Получить задачи по клиенту
   */
  async findByClient(clientId: string): Promise<Task[]> {
    const response = await api.get<Task[]>(`/tasks/client/${clientId}`);
    return response.data;
  }

  /**
   * Получить задачи по исполнителю
   */
  async findByAssignee(assignedToId: string): Promise<Task[]> {
    const response = await api.get<Task[]>(`/tasks/assignee/${assignedToId}`);
    return response.data;
  }

  /**
   * Получить задачи с приближающимися сроками
   */
  async getUpcomingTasks(hours: number = 24): Promise<Task[]> {
    const response = await api.get<Task[]>(`/tasks/upcoming`, { params: { hours } });
    return response.data;
  }

  /**
   * Получить просроченные задачи
   */
  async getOverdueTasks(): Promise<Task[]> {
    const response = await api.get<Task[]>('/tasks/overdue');
    return response.data;
  }
}

export const tasksService = new TasksService();

