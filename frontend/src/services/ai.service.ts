import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
}

class AIService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Генерация ответа через "ChatGPT"
   */
  async generateChatGPTResponse(dto: GenerateAIResponseDto): Promise<AIResponse> {
    const response = await axios.post<AIResponse>(
      `${API_URL}/ai/chatgpt/generate`,
      dto,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  /**
   * Генерация ответа через "Yandex GPT"
   */
  async generateYandexGPTResponse(dto: GenerateAIResponseDto): Promise<AIResponse> {
    const response = await axios.post<AIResponse>(
      `${API_URL}/ai/yandex-gpt/generate`,
      dto,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  /**
   * Получить статистику использования AI
   */
  async getStats(clientId?: string): Promise<AIStats> {
    const response = await axios.post<AIStats>(
      `${API_URL}/ai/stats`,
      { clientId },
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }
}

export const aiService = new AIService();

