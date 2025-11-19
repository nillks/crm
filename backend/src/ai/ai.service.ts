import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Groq from 'groq-sdk';
import { GenerateAiResponseDto } from './dto';
import { AiSetting, AiProvider } from '../entities/ai-setting.entity';
import { AiLog } from '../entities/ai-log.entity';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private groqClient: Groq;

  // Модель для использования (Llama 3.1 8B хорошо поддерживает русский)
  private readonly DEFAULT_MODEL = 'llama-3.1-8b-instant';
  
  // Альтернативные модели с хорошей поддержкой русского:
  // - 'llama-3.1-8b-instant' (быстрая, хороший русский)
  // - 'mixtral-8x7b-32768' (более мощная, отличный русский)
  // - 'llama-3.1-70b-versatile' (самая мощная, но медленнее)

  constructor(
    private configService: ConfigService,
    @InjectRepository(AiSetting)
    private aiSettingRepository: Repository<AiSetting>,
    @InjectRepository(AiLog)
    private aiLogRepository: Repository<AiLog>,
  ) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('⚠️ GROQ_API_KEY не установлен. AI функции будут работать в mock режиме.');
    } else {
      this.groqClient = new Groq({
        apiKey: apiKey,
      });
      this.logger.log('✅ Groq AI клиент инициализирован');
    }
  }

  /**
   * Генерация ответа через "ChatGPT" endpoint
   * На самом деле использует Groq с Llama 3.1
   */
  async generateChatGPTResponse(dto: GenerateAiResponseDto): Promise<{
    response: string;
    tokensUsed: number;
    model: string;
    provider: string;
  }> {
    return this.generateResponse(dto, AiProvider.OPENAI, 'ChatGPT');
  }

  /**
   * Генерация ответа через "Yandex GPT" endpoint
   * На самом деле использует Groq с Llama 3.1
   */
  async generateYandexGPTResponse(dto: GenerateAiResponseDto): Promise<{
    response: string;
    tokensUsed: number;
    model: string;
    provider: string;
  }> {
    return this.generateResponse(dto, AiProvider.YANDEX_GPT, 'Yandex GPT');
  }

  /**
   * Основной метод генерации ответа
   */
  private async generateResponse(
    dto: GenerateAiResponseDto,
    provider: AiProvider,
    providerName: string,
  ): Promise<{
    response: string;
    tokensUsed: number;
    model: string;
    provider: string;
  }> {
    // Объявляем переменные вне try блока для использования в catch
    let aiSetting: AiSetting | null = null;
    let systemPrompt: string;
    let temperature: number;
    let maxTokens: number;
    let model: string;
    
    try {
      // Получаем настройки AI для клиента, если указан clientId
      if (dto.clientId) {
        aiSetting = await this.aiSettingRepository.findOne({
          where: { clientId: dto.clientId },
        });

        if (aiSetting && !aiSetting.isEnabled) {
          throw new BadRequestException('AI отключен для этого клиента');
        }
      }

      // Определяем параметры запроса
      systemPrompt = dto.systemPrompt || 
                     aiSetting?.systemPrompt || 
                     this.getDefaultSystemPrompt(providerName);
      temperature = dto.temperature ?? 
                    (aiSetting?.temperature ? parseFloat(aiSetting.temperature.toString()) : 0.7);
      maxTokens = dto.maxTokens ?? 
                  aiSetting?.maxTokens ?? 
                  1000;
      model = aiSetting?.model || this.DEFAULT_MODEL;

      // Если API ключ не установлен, возвращаем mock ответ
      if (!this.groqClient) {
        this.logger.warn('⚠️ Groq API ключ не установлен, возвращаю mock ответ');
        const mockResponse = `[Mock ${providerName} Response] Это тестовый ответ на ваше сообщение: "${dto.message}". В production здесь будет реальный ответ от AI модели.`;
        
        // Сохраняем mock лог в БД
        const aiLog = this.aiLogRepository.create({
          clientId: dto.clientId || null,
          userId: dto.userId || null,
          provider: provider,
          model: 'mock',
          request: dto.message,
          response: mockResponse,
          systemPrompt: systemPrompt,
          tokensUsed: 0,
          temperature: temperature,
          maxTokens: maxTokens,
          metadata: { isMock: true },
          success: true,
        });
        await this.aiLogRepository.save(aiLog);
        
        return {
          response: mockResponse,
          tokensUsed: 0,
          model: 'mock',
          provider: providerName,
        };
      }

      // Формируем запрос к Groq
      const messages = [
        {
          role: 'system' as const,
          content: systemPrompt,
        },
        {
          role: 'user' as const,
          content: dto.message,
        },
      ];

      this.logger.log(`🤖 Запрос к ${providerName} (Groq ${model}): ${dto.message.substring(0, 100)}...`);

      const completion = await this.groqClient.chat.completions.create({
        model: model,
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens,
      });

      const response = completion.choices[0]?.message?.content || 'Не удалось получить ответ от AI';
      const tokensUsed = completion.usage?.total_tokens || 0;
      const promptTokens = completion.usage?.prompt_tokens || 0;
      const completionTokens = completion.usage?.completion_tokens || 0;

      this.logger.log(`✅ ${providerName} ответ получен (${tokensUsed} токенов)`);

      // Обновляем счетчик токенов в настройках AI
      if (aiSetting) {
        aiSetting.tokensUsed = (aiSetting.tokensUsed || 0) + tokensUsed;
        await this.aiSettingRepository.save(aiSetting);
      }

      // Сохраняем лог в БД
      const aiLog = this.aiLogRepository.create({
        clientId: dto.clientId || null,
        userId: dto.userId || null,
        provider: provider,
        model: model,
        request: dto.message,
        response: response,
        systemPrompt: systemPrompt,
        tokensUsed: tokensUsed,
        temperature: temperature,
        maxTokens: maxTokens,
        metadata: {
          promptTokens,
          completionTokens,
          totalTokens: tokensUsed,
          finishReason: completion.choices[0]?.finish_reason,
        },
        success: true,
      });
      await this.aiLogRepository.save(aiLog);

      // Логируем запрос и ответ
      this.logger.debug(`📝 ${providerName} запрос: ${dto.message}`);
      this.logger.debug(`📝 ${providerName} ответ: ${response.substring(0, 200)}...`);

      return {
        response,
        tokensUsed,
        model,
        provider: providerName,
      };
    } catch (error) {
      this.logger.error(`❌ Ошибка при генерации ответа ${providerName}:`, error);
      
      // Сохраняем лог об ошибке в БД
      try {
        // Используем уже определенные переменные или получаем значения по умолчанию
        const errorModel = model || this.DEFAULT_MODEL;
        const errorSystemPrompt = systemPrompt || this.getDefaultSystemPrompt(providerName);
        const errorTemperature = temperature ?? 0.7;
        const errorMaxTokens = maxTokens ?? 1000;
        
        const aiLog = this.aiLogRepository.create({
          clientId: dto.clientId || null,
          userId: dto.userId || null,
          provider: provider,
          model: errorModel,
          request: dto.message,
          response: '',
          systemPrompt: errorSystemPrompt,
          tokensUsed: 0,
          temperature: errorTemperature,
          maxTokens: errorMaxTokens,
          metadata: { error: error.message },
          success: false,
          error: error.message || 'Неизвестная ошибка',
        });
        await this.aiLogRepository.save(aiLog);
      } catch (logError) {
        this.logger.error(`❌ Ошибка при сохранении лога:`, logError);
      }
      
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        `Ошибка при генерации ответа: ${error.message || 'Неизвестная ошибка'}`,
      );
    }
  }

  /**
   * Получить дефолтный системный промпт в зависимости от провайдера
   */
  private getDefaultSystemPrompt(providerName: string): string {
    if (providerName === 'Yandex GPT') {
      return `Ты полезный AI-ассистент для CRM системы. Ты помогаешь операторам отвечать клиентам профессионально, вежливо и по делу. Отвечай на русском языке, будь кратким, но информативным.`;
    }
    
    return `You are a helpful AI assistant for a CRM system. You help operators respond to clients professionally, politely, and to the point. Respond in Russian, be concise but informative.`;
  }

  /**
   * Получить статистику использования AI
   */
  async getStats(clientId?: string): Promise<{
    totalRequests: number;
    totalTokens: number;
    clientsWithAI: number;
    successfulRequests: number;
    failedRequests: number;
  }> {
    // Статистика из настроек
    const settingsQuery = this.aiSettingRepository.createQueryBuilder('ai');
    if (clientId) {
      settingsQuery.where('ai.clientId = :clientId', { clientId });
    }
    const settings = await settingsQuery.getMany();
    
    // Статистика из логов
    const logsQuery = this.aiLogRepository.createQueryBuilder('log');
    if (clientId) {
      logsQuery.where('log.clientId = :clientId', { clientId });
    }
    const logs = await logsQuery.getMany();
    
    const successfulLogs = logs.filter(log => log.success);
    const failedLogs = logs.filter(log => !log.success);
    
    return {
      totalRequests: logs.length,
      totalTokens: logs.reduce((sum, log) => sum + (log.tokensUsed || 0), 0),
      clientsWithAI: settings.filter(s => s.isEnabled).length,
      successfulRequests: successfulLogs.length,
      failedRequests: failedLogs.length,
    };
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
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    logs: AiLog[];
    total: number;
  }> {
    const query = this.aiLogRepository.createQueryBuilder('log');
    
    if (params.clientId) {
      query.andWhere('log.clientId = :clientId', { clientId: params.clientId });
    }
    
    if (params.userId) {
      query.andWhere('log.userId = :userId', { userId: params.userId });
    }
    
    if (params.provider) {
      query.andWhere('log.provider = :provider', { provider: params.provider });
    }
    
    if (params.startDate) {
      query.andWhere('log.createdAt >= :startDate', { startDate: params.startDate });
    }
    
    if (params.endDate) {
      query.andWhere('log.createdAt <= :endDate', { endDate: params.endDate });
    }
    
    query.orderBy('log.createdAt', 'DESC');
    
    const total = await query.getCount();
    
    if (params.limit) {
      query.limit(params.limit);
    }
    if (params.offset) {
      query.offset(params.offset);
    }
    
    const logs = await query.getMany();
    
    return {
      logs,
      total,
    };
  }
}

