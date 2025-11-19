import api from './api';

export enum WABATemplateStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAUSED = 'paused',
}

export enum WABATemplateCategory {
  MARKETING = 'MARKETING',
  UTILITY = 'UTILITY',
  AUTHENTICATION = 'AUTHENTICATION',
}

export enum WABACampaignStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export interface WABATemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
  };
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

export interface WABATemplate {
  id: string;
  name: string;
  category: WABATemplateCategory;
  status: WABATemplateStatus;
  language?: string;
  components: WABATemplateComponent[];
  facebookTemplateId?: string;
  rejectionReason?: string;
  usageCount: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface WABACampaign {
  id: string;
  templateId: string;
  clientId: string;
  createdById?: string;
  status: WABACampaignStatus;
  parameters: Record<string, string>;
  scheduledAt?: string;
  sentAt?: string;
  facebookMessageId?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  template?: WABATemplate;
  client?: {
    id: string;
    name: string;
  };
  createdBy?: {
    id: string;
    email: string;
  };
}

export interface WABACredentials {
  id: string;
  accessToken: string; // Зашифрован
  phoneNumberId: string;
  businessAccountId: string;
  appId?: string;
  appSecret?: string; // Зашифрован
  webhookVerifyToken?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWABATemplateDto {
  name: string;
  category: WABATemplateCategory;
  language?: string;
  components: WABATemplateComponent[];
  metadata?: Record<string, any>;
}

export interface UpdateWABATemplateDto {
  name?: string;
  category?: WABATemplateCategory;
  status?: WABATemplateStatus;
  language?: string;
  components?: WABATemplateComponent[];
  facebookTemplateId?: string;
  rejectionReason?: string;
  metadata?: Record<string, any>;
}

export interface CreateWABACampaignDto {
  templateId: string;
  clientId: string;
  parameters: Record<string, string>;
  scheduledAt?: string;
  status?: WABACampaignStatus;
  metadata?: Record<string, any>;
}

export interface CreateWABACredentialsDto {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  appId?: string;
  appSecret?: string;
  webhookVerifyToken?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateWABACredentialsDto {
  accessToken?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  appId?: string;
  appSecret?: string;
  webhookVerifyToken?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface AITokenStats {
  used: number;
  limit: number;
  percentage: number;
}

class WABAService {
  /**
   * Создать шаблон
   */
  async createTemplate(dto: CreateWABATemplateDto): Promise<WABATemplate> {
    const response = await api.post<WABATemplate>('/waba/templates', dto);
    return response.data;
  }

  /**
   * Получить все шаблоны
   */
  async findAllTemplates(): Promise<WABATemplate[]> {
    const response = await api.get<WABATemplate[]>('/waba/templates');
    return response.data;
  }

  /**
   * Получить шаблон по ID
   */
  async findTemplateById(id: string): Promise<WABATemplate> {
    const response = await api.get<WABATemplate>(`/waba/templates/${id}`);
    return response.data;
  }

  /**
   * Обновить шаблон
   */
  async updateTemplate(id: string, dto: UpdateWABATemplateDto): Promise<WABATemplate> {
    const response = await api.put<WABATemplate>(`/waba/templates/${id}`, dto);
    return response.data;
  }

  /**
   * Удалить шаблон
   */
  async deleteTemplate(id: string): Promise<void> {
    await api.delete(`/waba/templates/${id}`);
  }

  /**
   * Создать кампанию
   */
  async createCampaign(dto: CreateWABACampaignDto): Promise<WABACampaign> {
    const response = await api.post<WABACampaign>('/waba/campaigns', dto);
    return response.data;
  }

  /**
   * Получить все кампании
   */
  async findAllCampaigns(): Promise<WABACampaign[]> {
    const response = await api.get<WABACampaign[]>('/waba/campaigns');
    return response.data;
  }

  /**
   * Получить кампанию по ID
   */
  async findCampaignById(id: string): Promise<WABACampaign> {
    const response = await api.get<WABACampaign>(`/waba/campaigns/${id}`);
    return response.data;
  }

  /**
   * Отправить кампанию
   */
  async sendCampaign(id: string): Promise<void> {
    await api.post(`/waba/campaigns/${id}/send`);
  }

  /**
   * Сохранить credentials
   */
  async saveCredentials(dto: CreateWABACredentialsDto): Promise<WABACredentials> {
    const response = await api.post<WABACredentials>('/waba/credentials', dto);
    return response.data;
  }

  /**
   * Обновить credentials
   */
  async updateCredentials(id: string, dto: UpdateWABACredentialsDto): Promise<WABACredentials> {
    const response = await api.put<WABACredentials>(`/waba/credentials/${id}`, dto);
    return response.data;
  }

  /**
   * Получить credentials
   */
  async getCredentials(): Promise<WABACredentials | null> {
    const response = await api.get<WABACredentials | null>('/waba/credentials');
    return response.data;
  }

  /**
   * Получить статистику токенов AI
   */
  async getAITokenStats(): Promise<AITokenStats> {
    const response = await api.get<AITokenStats>('/waba/ai-token-stats');
    return response.data;
  }
}

export const wabaService = new WABAService();

