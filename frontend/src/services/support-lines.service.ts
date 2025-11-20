import api from './api';

export interface SupportLine {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  maxOperators: number;
  settings?: {
    autoAssign?: boolean;
    roundRobin?: boolean;
    priority?: number;
    workingHours?: {
      enabled: boolean;
      timezone?: string;
      weekdays?: number[];
      startTime?: string;
      endTime?: string;
    };
  };
  operators?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupportLineDto {
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
  maxOperators?: number;
  settings?: {
    autoAssign?: boolean;
    roundRobin?: boolean;
    priority?: number;
    workingHours?: {
      enabled: boolean;
      timezone?: string;
      weekdays?: number[];
      startTime?: string;
      endTime?: string;
    };
  };
}

export interface UpdateSupportLineDto {
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
  maxOperators?: number;
  settings?: {
    autoAssign?: boolean;
    roundRobin?: boolean;
    priority?: number;
    workingHours?: {
      enabled: boolean;
      timezone?: string;
      weekdays?: number[];
      startTime?: string;
      endTime?: string;
    };
  };
}

class SupportLinesService {
  /**
   * Получить все линии поддержки
   */
  async findAll(): Promise<SupportLine[]> {
    const response = await api.get<SupportLine[]>('/support-lines');
    return response.data;
  }

  /**
   * Получить линию по ID
   */
  async findOne(id: string): Promise<SupportLine> {
    const response = await api.get<SupportLine>(`/support-lines/${id}`);
    return response.data;
  }

  /**
   * Создать линию поддержки
   */
  async create(dto: CreateSupportLineDto): Promise<SupportLine> {
    const response = await api.post<SupportLine>('/support-lines', dto);
    return response.data;
  }

  /**
   * Обновить линию поддержки
   */
  async update(id: string, dto: UpdateSupportLineDto): Promise<SupportLine> {
    const response = await api.put<SupportLine>(`/support-lines/${id}`, dto);
    return response.data;
  }

  /**
   * Удалить линию поддержки
   */
  async remove(id: string): Promise<void> {
    await api.delete(`/support-lines/${id}`);
  }

  /**
   * Назначить оператора на линию
   */
  async assignOperator(lineId: string, userId: string): Promise<any> {
    const response = await api.post(`/support-lines/${lineId}/operators/${userId}`);
    return response.data;
  }

  /**
   * Убрать оператора с линии
   */
  async unassignOperator(userId: string): Promise<any> {
    const response = await api.delete(`/support-lines/operators/${userId}`);
    return response.data;
  }
}

export const supportLinesService = new SupportLinesService();

