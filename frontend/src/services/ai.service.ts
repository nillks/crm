import api from './api';

export interface GenerateAIResponseDto {
  message: string;
  clientId?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  response: string;
  tokensUsed: number;
  model: string;
  provider: string;
}

export interface AIStats {
  totalRequests: number;
  totalTokens: number;
  clientsWithAI: number;
  successfulRequests: number;
  failedRequests: number;
}

export enum AiProvider {
  OPENAI = 'openai',
  YANDEX_GPT = 'yandex_gpt',
}

export interface AiSetting {
  id: string;
  clientId: string;
  isEnabled: boolean;
  provider: AiProvider;
  model: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens?: number;
  tokensUsed: number;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAiSettingDto {
  isEnabled?: boolean;
  provider?: AiProvider;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AiLog {
  id: string;
  clientId?: string;
  userId?: string;
  provider: AiProvider;
  model: string;
  request: string;
  response: string;
  systemPrompt?: string;
  tokensUsed: number;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, any>;
  success: boolean;
  error?: string;
  createdAt: string;
}

export interface AiLogsResponse {
  logs: AiLog[];
  total: number;
}

class AIService {
  /**
   * Генерация ответа через "ChatGPT"
   */
  async generateChatGPTResponse(dto: GenerateAIResponseDto): Promise<AIResponse> {
    const response = await api.post<AIResponse>('/ai/chatgpt/generate', dto);
    return response.data;
  }

  /**
   * Генерация ответа через "Yandex GPT"
   */
  async generateYandexGPTResponse(dto: GenerateAIResponseDto): Promise<AIResponse> {
    const response = await api.post<AIResponse>('/ai/yandex-gpt/generate', dto);
    return response.data;
  }

  /**
   * Получить статистику использования AI
   */
  async getStats(clientId?: string): Promise<AIStats> {
    const params = clientId ? { clientId } : {};
    const response = await api.get<AIStats>('/ai/stats', { params });
    return response.data;
  }

  /**
   * Получить настройки AI для клиента
   */
  async getSetting(clientId: string): Promise<AiSetting | null> {
    const response = await api.get<AiSetting | null>(`/ai/settings/${clientId}`);
    return response.data;
  }

  /**
   * Создать или обновить настройки AI для клиента
   */
  async updateSetting(clientId: string, dto: UpdateAiSettingDto): Promise<AiSetting> {
    const response = await api.put<AiSetting>(`/ai/settings/${clientId}`, dto);
    return response.data;
  }

  /**
   * Переключить включение/выключение AI для клиента
   */
  async toggleSetting(clientId: string): Promise<AiSetting> {
    const response = await api.post<AiSetting>(`/ai/settings/${clientId}/toggle`);
    return response.data;
  }

  /**
   * Получить логи AI запросов
   */
  async getLogs(params: {
    clientId?: string;
    userId?: string;
    provider?: AiProvider;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<AiLogsResponse> {
    const response = await api.get<AiLogsResponse>('/ai/logs', { params });
    return response.data;
  }
}

export const aiService = new AIService();

