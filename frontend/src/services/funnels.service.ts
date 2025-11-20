import api from './api';

export interface Funnel {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  order: number;
  stages: FunnelStage[];
  createdAt: string;
  updatedAt: string;
}

export interface FunnelStage {
  id: string;
  funnelId: string;
  name: string;
  description?: string;
  order: number;
  ticketStatus?: string;
  isFinal: boolean;
  isActive: boolean;
  nextStageId?: string;
  autoTransitionRules?: {
    onStatusChange?: string[];
    onTimeElapsed?: number;
    onAction?: string[];
    conditions?: {
      minComments?: number;
      minMessages?: number;
      requiredStatus?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateFunnelDto {
  name: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}

export interface UpdateFunnelDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}

export interface CreateFunnelStageDto {
  funnelId: string;
  name: string;
  description?: string;
  order: number;
  ticketStatus?: string;
  isFinal?: boolean;
  isActive?: boolean;
  nextStageId?: string;
  autoTransitionRules?: {
    onStatusChange?: string[];
    onTimeElapsed?: number;
    onAction?: string[];
    conditions?: {
      minComments?: number;
      minMessages?: number;
      requiredStatus?: string;
    };
  };
}

export interface UpdateFunnelStageDto {
  funnelId?: string;
  name?: string;
  description?: string;
  order?: number;
  ticketStatus?: string;
  isFinal?: boolean;
  isActive?: boolean;
  nextStageId?: string;
  autoTransitionRules?: {
    onStatusChange?: string[];
    onTimeElapsed?: number;
    onAction?: string[];
    conditions?: {
      minComments?: number;
      minMessages?: number;
      requiredStatus?: string;
    };
  };
}

export interface FunnelStats {
  funnelId: string;
  funnelName: string;
  stages: {
    stageId: string;
    stageName: string;
    ticketCount: number;
    percentage: number;
  }[];
  totalTickets: number;
  conversionRate: number;
}

class FunnelsService {
  /**
   * Получить все воронки
   */
  async findAll(): Promise<Funnel[]> {
    const response = await api.get<Funnel[]>('/funnels');
    return response.data;
  }

  /**
   * Получить активные воронки
   */
  async findActive(): Promise<Funnel[]> {
    const response = await api.get<Funnel[]>('/funnels/active');
    return response.data;
  }

  /**
   * Получить воронку по ID
   */
  async findOne(id: string): Promise<Funnel> {
    const response = await api.get<Funnel>(`/funnels/${id}`);
    return response.data;
  }

  /**
   * Создать воронку
   */
  async create(dto: CreateFunnelDto): Promise<Funnel> {
    const response = await api.post<Funnel>('/funnels', dto);
    return response.data;
  }

  /**
   * Обновить воронку
   */
  async update(id: string, dto: UpdateFunnelDto): Promise<Funnel> {
    const response = await api.patch<Funnel>(`/funnels/${id}`, dto);
    return response.data;
  }

  /**
   * Удалить воронку
   */
  async remove(id: string): Promise<void> {
    await api.delete(`/funnels/${id}`);
  }

  /**
   * Получить этапы воронки
   */
  async findStagesByFunnel(funnelId: string): Promise<FunnelStage[]> {
    const response = await api.get<FunnelStage[]>(`/funnels/${funnelId}/stages`);
    return response.data;
  }

  /**
   * Создать этап воронки
   */
  async createStage(dto: CreateFunnelStageDto): Promise<FunnelStage> {
    const response = await api.post<FunnelStage>('/funnels/stages', dto);
    return response.data;
  }

  /**
   * Обновить этап воронки
   */
  async updateStage(id: string, dto: UpdateFunnelStageDto): Promise<FunnelStage> {
    const response = await api.patch<FunnelStage>(`/funnels/stages/${id}`, dto);
    return response.data;
  }

  /**
   * Удалить этап воронки
   */
  async removeStage(id: string): Promise<void> {
    await api.delete(`/funnels/stages/${id}`);
  }

  /**
   * Получить статистику по воронке
   */
  async getFunnelStats(funnelId: string, startDate?: string, endDate?: string): Promise<FunnelStats> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get<FunnelStats>(
      `/funnels/${funnelId}/stats${params.toString() ? `?${params.toString()}` : ''}`,
    );
    return response.data;
  }
}

export const funnelsService = new FunnelsService();

