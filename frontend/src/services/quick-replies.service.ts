import api from './api';

export enum QuickReplyChannel {
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  INSTAGRAM = 'instagram',
  ALL = 'all',
}

export interface FileInfo {
  id: string;
  fileName: string;
  url: string;
  mimeType: string;
  type: string;
}

export interface QuickReply {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'file';
  files?: FileInfo[];
  channel: QuickReplyChannel;
  category?: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuickReplyDto {
  title: string;
  content: string;
  type?: 'text' | 'file';
  files?: FileInfo[];
  channel: QuickReplyChannel;
  category?: string;
  isActive?: boolean;
}

export interface UpdateQuickReplyDto {
  title?: string;
  content?: string;
  type?: 'text' | 'file';
  files?: FileInfo[];
  channel?: QuickReplyChannel;
  category?: string;
  isActive?: boolean;
}

export interface FilterQuickRepliesDto {
  channel?: QuickReplyChannel;
  category?: string;
  isActive?: boolean;
}

class QuickRepliesService {
  /**
   * Создать шаблон
   */
  async create(dto: CreateQuickReplyDto): Promise<QuickReply> {
    const response = await api.post<QuickReply>('/quick-replies', dto);
    return response.data;
  }

  /**
   * Получить все шаблоны с фильтрами
   */
  async findAll(filterDto: FilterQuickRepliesDto = {}): Promise<QuickReply[]> {
    const response = await api.get<QuickReply[]>('/quick-replies', { params: filterDto });
    return response.data;
  }

  /**
   * Получить шаблон по ID
   */
  async findOne(id: string): Promise<QuickReply> {
    const response = await api.get<QuickReply>(`/quick-replies/${id}`);
    return response.data;
  }

  /**
   * Обновить шаблон
   */
  async update(id: string, dto: UpdateQuickReplyDto): Promise<QuickReply> {
    const response = await api.put<QuickReply>(`/quick-replies/${id}`, dto);
    return response.data;
  }

  /**
   * Удалить шаблон
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/quick-replies/${id}`);
  }

  /**
   * Получить шаблоны по каналу
   */
  async findByChannel(channel: QuickReplyChannel): Promise<QuickReply[]> {
    const response = await api.get<QuickReply[]>(`/quick-replies/channel/${channel}`);
    return response.data;
  }

  /**
   * Получить категории
   */
  async getCategories(channel?: QuickReplyChannel): Promise<string[]> {
    const params = channel ? { channel } : {};
    const response = await api.get<string[]>('/quick-replies/categories', { params });
    return response.data;
  }

  /**
   * Увеличить счетчик использования
   */
  async incrementUsage(id: string): Promise<void> {
    await api.post(`/quick-replies/${id}/use`);
  }
}

export const quickRepliesService = new QuickRepliesService();

