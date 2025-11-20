import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { Message, MessageChannel, MessageDirection } from '../entities/message.entity';
import { Client } from '../entities/client.entity';
import { Ticket, TicketStatus, TicketChannel } from '../entities/ticket.entity';
import { User } from '../entities/user.entity';
import { RoleName } from '../entities/role.entity';
import { SendInstagramMessageDto } from './dto/send-message.dto';
import { AIService } from '../ai/ai.service';

// Мок-формат для webhook (имитация Instagram Graph API)
interface InstagramWebhook {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    messaging?: Array<{
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: {
        mid: string;
        text?: string;
        attachments?: Array<{
          type: string;
          payload: {
            url?: string;
          };
        }>;
      };
    }>;
  }>;
}

@Injectable()
export class InstagramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InstagramService.name);
  private readonly useMockMode: boolean;
  private readonly apiUrl: string;
  private readonly accessToken: string;
  private readonly pageId: string;
  private readonly useChatrace: boolean;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private aiService: AIService,
  ) {
    this.apiUrl = this.configService.get('INSTAGRAM_API_URL', 'https://api.chatrace.com');
    this.accessToken = this.configService.get('INSTAGRAM_ACCESS_TOKEN', '');
    this.pageId = this.configService.get('INSTAGRAM_PAGE_ID', '');
    this.useMockMode = this.configService.get('INSTAGRAM_USE_MOCK', 'false') === 'true';
    this.useChatrace = this.configService.get('INSTAGRAM_USE_CHATRACE', 'true') === 'true';
    
    // Логируем конфигурацию для диагностики
    this.logger.log(`Instagram Service Config:`);
    this.logger.log(`  - API URL: ${this.apiUrl}`);
    this.logger.log(`  - Access Token: ${this.accessToken ? `${this.accessToken.substring(0, 10)}...${this.accessToken.substring(this.accessToken.length - 5)}` : 'NOT SET'}`);
    this.logger.log(`  - Use Chatrace: ${this.useChatrace}`);
    this.logger.log(`  - Use Mock Mode: ${this.useMockMode}`);

    const mode = this.useMockMode ? 'MOCK MODE' : (this.useChatrace ? 'CHATRACE API' : 'INSTAGRAM GRAPH API');
    this.logger.log(`Instagram Service initialized (${mode})`);
    
    if (this.useMockMode) {
      this.logger.log('Instagram работает в мок-режиме. Сообщения сохраняются в БД, но не отправляются в Instagram.');
    } else if (this.useChatrace) {
      if (!this.accessToken) {
        this.logger.warn('Chatrace Access Token not set. Please check .env file.');
      } else {
        this.logger.log('Chatrace API configured');
      }
    } else {
      if (!this.accessToken || !this.pageId) {
        this.logger.warn('Instagram credentials not fully configured. Please check .env file.');
      }
    }
  }

  /**
   * Запуск polling для получения сообщений через Chatrace API (если поддерживается)
   */
  onModuleInit() {
    if (this.useChatrace && !this.useMockMode && this.accessToken) {
      this.logger.log('🔧 InstagramService onModuleInit called');
      this.logger.log('📡 Starting Instagram message polling (Chatrace)...');
      this.startPolling();
    } else if (this.useMockMode) {
      this.logger.log('📝 Instagram in MOCK mode - polling disabled');
    } else if (!this.accessToken) {
      this.logger.warn('⚠️ Instagram Access Token not set - polling disabled');
    }
  }

  onModuleDestroy() {
    this.stopPolling();
  }

  /**
   * Запуск polling для получения сообщений через Chatrace API
   */
  private startPolling() {
    if (this.pollingInterval) {
      return; // Уже запущен
    }

    this.isPolling = true;
    this.logger.log(`✅ Starting Instagram message polling (checking every 10 seconds)`);
    this.logger.log(`📡 API URL: ${this.apiUrl}`);

    // Проверяем сообщения каждые 10 секунд
    this.pollingInterval = setInterval(async () => {
      if (!this.isPolling) return;
      await this.checkForNewMessages();
    }, 10000); // 10 секунд

    // Первая проверка сразу
    this.checkForNewMessages();
  }

  /**
   * Остановка polling
   */
  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.isPolling = false;
      this.logger.log('🛑 Instagram polling stopped');
    }
  }

  /**
   * Проверка новых сообщений через Chatrace API
   * Публичный метод для тестирования
   */
  async checkForNewMessages(): Promise<void> {
    if (!this.useChatrace || this.useMockMode || !this.accessToken) {
      this.logger.debug(`⏭️ Skipping Instagram polling: useChatrace=${this.useChatrace}, useMockMode=${this.useMockMode}, hasToken=${!!this.accessToken}`);
      return;
    }

    try {
      this.logger.log(`🔍 Starting Instagram message check...`);
      // Пробуем разные возможные endpoints Chatrace для получения сообщений
      const possibleEndpoints = [
        `${this.apiUrl}/messages/receive`,
        `${this.apiUrl}/messages/get`,
        `${this.apiUrl}/instagram/messages`,
        `${this.apiUrl}/api/messages`,
      ];

      for (const url of possibleEndpoints) {
        try {
          this.logger.log(`🔍 Checking for new Instagram messages: ${url}`);
          
          // Пробуем разные форматы авторизации
          const authHeaders = [
            { Authorization: `Bearer ${this.accessToken}` },
            { 'X-API-Key': this.accessToken },
            { 'api-key': this.accessToken },
            { 'token': this.accessToken },
            { 'access-token': this.accessToken },
          ];

          let lastError: any = null;
          for (const authHeader of authHeaders) {
            try {
              const response = await firstValueFrom(
                this.httpService.get(url, {
                  headers: {
                    ...authHeader,
                    'Content-Type': 'application/json',
                  },
                  timeout: 10000,
                }),
              );

              if (response.data) {
                this.logger.log(`📦 Received response from Chatrace: ${JSON.stringify(response.data, null, 2)}`);
                
                // Обрабатываем ответ
                if (Array.isArray(response.data)) {
                  // Массив сообщений
                  for (const message of response.data) {
                    await this.processChatraceWebhook(message);
                  }
                } else if (response.data.messages && Array.isArray(response.data.messages)) {
                  // Объект с массивом messages
                  for (const message of response.data.messages) {
                    await this.processChatraceWebhook(message);
                  }
                } else if (response.data.data && Array.isArray(response.data.data)) {
                  // Объект с массивом data
                  for (const message of response.data.data) {
                    await this.processChatraceWebhook(message);
                  }
                } else {
                  // Одиночное сообщение
                  await this.processChatraceWebhook(response.data);
                }
                
                // Если получили ответ, прекращаем попытки других endpoints и форматов авторизации
                return;
              }
            } catch (error: any) {
              lastError = error;
              // Если это 401, пробуем следующий формат авторизации
              if (error.response?.status === 401) {
                this.logger.debug(`   Auth format failed (401), trying next...`);
                continue;
              }
              // Для других ошибок пробрасываем дальше
              throw error;
            }
          }
          
          // Если все форматы авторизации не сработали
          if (lastError) {
            throw lastError;
          }
        } catch (error: any) {
          // Если endpoint не найден (404), пробуем следующий
          if (error.response?.status === 404) {
            this.logger.log(`⚠️ Endpoint ${url} not found (404), trying next...`);
            continue;
          }
          // Для других ошибок логируем, но продолжаем
          if (error.code !== 'ECONNABORTED') {
            this.logger.warn(`❌ Error checking ${url}: ${error.message} (status: ${error.response?.status || 'N/A'})`);
            if (error.response?.data) {
              this.logger.warn(`   Response data: ${JSON.stringify(error.response.data)}`);
            }
          }
        }
      }

      // Если ни один endpoint не сработал, это нормально - возможно, Chatrace использует только webhooks
      this.logger.log(`📭 No new Instagram messages or polling not supported by Chatrace`);
    } catch (error: any) {
      // Игнорируем ошибки polling - возможно, Chatrace не поддерживает polling
      if (error.code !== 'ECONNABORTED') {
        this.logger.debug(`Error in Instagram polling: ${error.message}`);
      }
    }
  }

  /**
   * Обработка входящего webhook от Instagram (или мок-данных)
   */
  async handleWebhook(webhookData: InstagramWebhook | any): Promise<void> {
    try {
      this.logger.log(`Received webhook from Instagram (${this.useMockMode ? 'MOCK' : 'API'})`);

      if (this.useMockMode) {
        // В мок-режиме обрабатываем любой формат данных
        await this.processMockWebhook(webhookData);
      } else if (this.useChatrace) {
        // Обработчик для Chatrace API
        await this.processChatraceWebhook(webhookData);
      } else {
        // Реальный обработчик для Instagram Graph API
        await this.processInstagramWebhook(webhookData);
      }
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      throw error;
    }
  }

  /**
   * Обработка мок-данных (для разработки без реального API)
   */
  private async processMockWebhook(data: any): Promise<void> {
    try {
      // Извлекаем данные из разных возможных форматов
      const senderId = data.senderId || data.sender?.id || data.userId || 'mock-user-123';
      const messageId = data.messageId || data.id || `mock-${Date.now()}`;
      const text = data.text || data.message || data.content || 'Тестовое сообщение из Instagram';
      const username = data.username || data.senderName || `Instagram User ${senderId}`;
      const timestamp = data.timestamp || data.time || Date.now();

      // Находим или создаем клиента
      const client = await this.findOrCreateClient(senderId, username);

      // Проверяем, не существует ли уже сообщение
      const existingMessage = await this.messagesRepository.findOne({
        where: { externalId: `instagram-${messageId}` },
      });

      if (existingMessage) {
        this.logger.warn(`Message instagram-${messageId} already exists, skipping`);
        return;
      }

      // Находим или создаем тикет
      const ticket = await this.findOrCreateTicket(client);

      // Сохраняем сообщение
      const savedMessage = this.messagesRepository.create({
        channel: MessageChannel.INSTAGRAM,
        direction: MessageDirection.INBOUND,
        content: text,
        externalId: `instagram-${messageId}`,
        clientId: client.id,
        ticketId: ticket?.id || null,
        isRead: false,
        isDelivered: true,
        deliveredAt: new Date(timestamp),
      });

      await this.messagesRepository.save(savedMessage);

      this.logger.log(`Mock Instagram message processed: ${messageId} from ${username}`);
    } catch (error) {
      this.logger.error('Error processing mock webhook:', error);
      throw error;
    }
  }

  /**
   * Обработка webhook от Chatrace API
   */
  private async processChatraceWebhook(data: any): Promise<void> {
    try {
      this.logger.log(`🔄 Processing Chatrace webhook: ${JSON.stringify(data, null, 2)}`);
      
      // Chatrace может отправлять данные в разных форматах
      // Проверяем все возможные варианты структуры данных
      
      // Вариант 1: Прямые поля в корне объекта
      let senderId = data.senderId || data.userId || data.fromId || data.from?.id;
      let messageId = data.messageId || data.id || data.message_id;
      let text = data.text || data.message || data.content || data.body;
      let username = data.username || data.senderName || data.fromName || data.name;
      let timestamp = data.timestamp || data.time || data.created_at || Date.now();
      
      // Вариант 2: Вложенная структура (Instagram Graph API формат)
      if (!senderId) {
        senderId = data.sender?.id || data.from?.id || data.user?.id;
      }
      if (!messageId) {
        messageId = data.message?.mid || data.message?.id || data.message_id;
      }
      if (!text) {
        text = data.message?.text || data.message?.content || data.message?.body;
      }
      if (!username) {
        username = data.sender?.username || data.from?.username || data.user?.username || 
                   data.sender?.name || data.from?.name || data.user?.name;
      }
      if (!timestamp || timestamp === Date.now()) {
        timestamp = data.message?.timestamp || data.timestamp || data.created_at || Date.now();
      }
      
      // Вариант 3: Массив сообщений (если Chatrace отправляет массив)
      if (Array.isArray(data)) {
        this.logger.log(`📦 Chatrace webhook is an array with ${data.length} items`);
        for (const item of data) {
          await this.processChatraceWebhook(item);
        }
        return;
      }
      
      // Вариант 4: Вложенная структура с entry (Instagram Graph API формат)
      if (data.entry && Array.isArray(data.entry)) {
        this.logger.log(`📦 Chatrace webhook has entry array with ${data.entry.length} items`);
        for (const entry of data.entry) {
          if (entry.messaging && Array.isArray(entry.messaging)) {
            for (const messaging of entry.messaging) {
              const entrySenderId = messaging.sender?.id || messaging.from?.id;
              const entryMessageId = messaging.message?.mid || messaging.message?.id;
              const entryText = messaging.message?.text || messaging.message?.content;
              const entryTimestamp = messaging.timestamp || entry.time;
              
              if (entrySenderId && entryText) {
                await this.processSingleChatraceMessage({
                  senderId: entrySenderId,
                  messageId: entryMessageId,
                  text: entryText,
                  username: messaging.sender?.username || messaging.from?.username,
                  timestamp: entryTimestamp,
                });
              }
            }
          }
        }
        return;
      }

      // Логируем извлеченные данные
      this.logger.log(`📝 Extracted data from Chatrace webhook:`);
      this.logger.log(`  - senderId: ${senderId || 'MISSING'}`);
      this.logger.log(`  - messageId: ${messageId || 'MISSING'}`);
      this.logger.log(`  - text: ${text ? text.substring(0, 100) : 'MISSING'}`);
      this.logger.log(`  - username: ${username || 'MISSING'}`);
      this.logger.log(`  - timestamp: ${timestamp}`);

      if (!senderId) {
        this.logger.warn('⚠️ Chatrace webhook: senderId is missing! Full data structure:');
        this.logger.warn(JSON.stringify(data, null, 2));
        return;
      }
      
      if (!text || text.trim() === '') {
        this.logger.warn('⚠️ Chatrace webhook: text is missing or empty! Full data structure:');
        this.logger.warn(JSON.stringify(data, null, 2));
        // Не возвращаемся - возможно, это медиа-сообщение, обработаем его
        text = '[Медиа сообщение]';
      }
      
      await this.processSingleChatraceMessage({
        senderId,
        messageId,
        text,
        username,
        timestamp,
      });
    } catch (error) {
      this.logger.error('Error processing Chatrace webhook:', error);
      throw error;
    }
  }
  
  /**
   * Обработка одного сообщения от Chatrace
   */
  private async processSingleChatraceMessage({
    senderId,
    messageId,
    text,
    username,
    timestamp,
  }: {
    senderId: string;
    messageId?: string;
    text: string;
    username?: string;
    timestamp: number;
  }): Promise<void> {
    try {
      const finalMessageId = messageId || `chatrace-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const finalUsername = username || `Chatrace User ${senderId}`;
      
      // Находим или создаем клиента
      const client = await this.findOrCreateClient(senderId, finalUsername);

      // Проверяем дубликаты
      const existingMessage = await this.messagesRepository.findOne({
        where: { externalId: `instagram-${finalMessageId}` },
      });

      if (existingMessage) {
        this.logger.warn(`Message instagram-${finalMessageId} already exists, skipping`);
        return;
      }

      // Находим или создаем тикет
      const ticket = await this.findOrCreateTicket(client);

      // Сохраняем сообщение
      const savedMessage = this.messagesRepository.create({
        channel: MessageChannel.INSTAGRAM,
        direction: MessageDirection.INBOUND,
        content: text,
        externalId: `instagram-${finalMessageId}`,
        clientId: client.id,
        ticketId: ticket?.id || null,
        isRead: false,
        isDelivered: true,
        deliveredAt: new Date(typeof timestamp === 'number' ? timestamp * 1000 : timestamp),
      });

      await this.messagesRepository.save(savedMessage);

      this.logger.log(`✅ Chatrace Instagram message processed: ${finalMessageId} from ${finalUsername} (${senderId})`);

      // Автоматический вызов AI для входящих сообщений
      // Выполняем асинхронно, чтобы не блокировать обработку сообщения
      if (text && text.trim() && client) {
        // Запускаем AI в фоне, не ждем результата
        setImmediate(async () => {
          try {
            const aiSetting = await this.aiService.getSetting(client.id);
            if (aiSetting && aiSetting.isEnabled) {
              // Проверяем рабочее время перед вызовом AI
              const workingHours = aiSetting.workingHours;
              if (workingHours && workingHours.enabled) {
                const now = new Date();
                const timezone = workingHours.timezone || 'Europe/Moscow';
                const timeInTimezone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
                const currentDay = timeInTimezone.getDay();
                
                if (workingHours.weekdays && workingHours.weekdays.length > 0 && !workingHours.weekdays.includes(currentDay)) {
                  this.logger.log(`⏰ AI пропущен: выходной день для клиента ${client.id}`);
                  return;
                }
                
                if (workingHours.startTime && workingHours.endTime) {
                  const [startHour, startMinute] = workingHours.startTime.split(':').map(Number);
                  const [endHour, endMinute] = workingHours.endTime.split(':').map(Number);
                  const currentHour = timeInTimezone.getHours();
                  const currentMinute = timeInTimezone.getMinutes();
                  const currentTimeInMinutes = currentHour * 60 + currentMinute;
                  const startTimeInMinutes = startHour * 60 + startMinute;
                  const endTimeInMinutes = endHour * 60 + endMinute;
                  
                  if (currentTimeInMinutes < startTimeInMinutes || currentTimeInMinutes >= endTimeInMinutes) {
                    this.logger.log(`⏰ AI пропущен: вне рабочего времени для клиента ${client.id}`);
                    return;
                  }
                }
              }
              
              this.logger.log(`🤖 AI включен для клиента ${client.id}, генерирую ответ...`);
              
              // Генерируем ответ через AI
              const aiResponse = await this.aiService.generateChatGPTResponse({
                message: text,
                clientId: client.id,
                userId: null, // Системный вызов
              });

              if (aiResponse && aiResponse.response) {
                this.logger.log(`✅ AI сгенерировал ответ: ${aiResponse.response.substring(0, 100)}...`);
                
                // Отправляем ответ клиенту
                await this.sendMessage({
                  recipientId: senderId,
                  message: aiResponse.response,
                  ticketId: ticket?.id || null,
                }, null); // null user = системный вызов
                
                this.logger.log(`✅ AI ответ отправлен клиенту ${senderId}`);
              }
            }
          } catch (aiError: any) {
            // Не прерываем обработку сообщения, если AI не сработал
            this.logger.error(`⚠️ Ошибка при вызове AI: ${aiError.message || aiError}`);
            this.logger.error(`⚠️ Stack trace: ${aiError.stack || 'N/A'}`);
          }
        });
      }
    } catch (error) {
      this.logger.error('Error processing single Chatrace message:', error);
      throw error;
    }
  }

  /**
   * Обработка реального webhook от Instagram Graph API
   */
  private async processInstagramWebhook(webhookData: InstagramWebhook): Promise<void> {
    try {
      for (const entry of webhookData.entry || []) {
        for (const messaging of entry.messaging || []) {
          const senderId = messaging.sender.id;
          const messageId = messaging.message?.mid;
          const text = messaging.message?.text || '';
          const timestamp = messaging.timestamp;

          if (!messageId || !text) {
            continue;
          }

          // Находим или создаем клиента
          const client = await this.findOrCreateClient(senderId, `Instagram ${senderId}`);

          // Проверяем дубликаты
          const existingMessage = await this.messagesRepository.findOne({
            where: { externalId: `instagram-${messageId}` },
          });

          if (existingMessage) {
            continue;
          }

          // Находим или создаем тикет
          const ticket = await this.findOrCreateTicket(client);

          // Сохраняем сообщение
          const savedMessage = this.messagesRepository.create({
            channel: MessageChannel.INSTAGRAM,
            direction: MessageDirection.INBOUND,
            content: text,
            externalId: `instagram-${messageId}`,
            clientId: client.id,
            ticketId: ticket?.id || null,
            isRead: false,
            isDelivered: true,
            deliveredAt: new Date(timestamp * 1000),
          });

          await this.messagesRepository.save(savedMessage);

          this.logger.log(`Instagram message processed: ${messageId} from ${senderId}`);
        }
      }
    } catch (error) {
      this.logger.error('Error processing Instagram webhook:', error);
      throw error;
    }
  }

  /**
   * Найти или создать клиента по Instagram ID
   */
  private async findOrCreateClient(
    instagramId: string,
    username?: string,
  ): Promise<Client> {
    // Ищем клиента по Instagram ID
    let client = await this.clientsRepository.findOne({
      where: { instagramId },
    });

    if (!client) {
      // Создаем нового клиента
      const name = username || `Instagram ${instagramId}`;

      client = this.clientsRepository.create({
        name,
        instagramId,
        status: 'active',
      });

      client = await this.clientsRepository.save(client);
      this.logger.log(`Created new client: ${client.id} for Instagram user ${instagramId}`);
    } else {
      // Обновляем имя, если оно было передано
      if (username && client.name !== username && !client.name.includes('Instagram')) {
        client.name = username;
        await this.clientsRepository.save(client);
      }
    }

    return client;
  }

  /**
   * Найти или создать тикет для клиента
   */
  private async findOrCreateTicket(client: Client): Promise<Ticket | null> {
    // Ищем открытый тикет для этого клиента в Instagram
    let ticket = await this.ticketsRepository.findOne({
      where: {
        clientId: client.id,
        channel: TicketChannel.INSTAGRAM,
        status: TicketStatus.NEW,
      },
      order: { createdAt: 'DESC' },
    });

    if (!ticket) {
      // Создаем новый тикет
      const adminUser = await this.usersRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .where('role.name = :roleName', { roleName: RoleName.ADMIN })
        .getOne();

      if (!adminUser) {
        this.logger.warn('Admin user not found for ticket creation. Message will be saved without ticket.');
        return null;
      }

      ticket = this.ticketsRepository.create({
        title: `Instagram сообщение от ${client.name}`,
        description: 'Тикет создан автоматически из входящего сообщения Instagram',
        clientId: client.id,
        createdById: adminUser.id,
        channel: TicketChannel.INSTAGRAM,
        status: TicketStatus.NEW,
        priority: 0,
      });

      ticket = await this.ticketsRepository.save(ticket);
      this.logger.log(`Created new ticket: ${ticket.id} for client ${client.id}`);
    }

    return ticket;
  }

  /**
   * Отправить сообщение через Instagram API (или мок)
   */
  async sendMessage(sendMessageDto: SendInstagramMessageDto, user: User | null): Promise<any> {
    try {
      const { recipientId, message, ticketId } = sendMessageDto;

      // Находим клиента
      let client = await this.clientsRepository.findOne({
        where: { instagramId: recipientId },
      });

      if (!client) {
        throw new NotFoundException(`Клиент с Instagram ID ${recipientId} не найден`);
      }

      if (this.useMockMode) {
        // В мок-режиме просто сохраняем сообщение в БД
        const mockMessageId = `mock-${Date.now()}`;
        
        const savedMessage = this.messagesRepository.create({
          channel: MessageChannel.INSTAGRAM,
          direction: MessageDirection.OUTBOUND,
          content: message,
          externalId: `instagram-${mockMessageId}`,
          clientId: client.id,
          ticketId: ticketId || null,
          isRead: false,
          isDelivered: false,
        });

        await this.messagesRepository.save(savedMessage);

        this.logger.log(`Mock Instagram message saved: ${mockMessageId} to ${recipientId}`);

        return {
          success: true,
          messageId: mockMessageId,
          recipientId,
          message: savedMessage,
          mock: true,
        };
      } else if (this.useChatrace) {
        // Отправка через Chatrace API
        const url = `${this.apiUrl}/messages/send`; // Предполагаемый endpoint Chatrace

        const payload = {
          recipient_id: recipientId,
          message: message,
        };

        try {
          const response = await firstValueFrom(
            this.httpService.post(url, payload, {
              headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
              },
            }),
          );

          const messageId = response.data?.message_id || response.data?.id || `chatrace-${Date.now()}`;

          // Сохраняем сообщение в БД
          const savedMessage = this.messagesRepository.create({
            channel: MessageChannel.INSTAGRAM,
            direction: MessageDirection.OUTBOUND,
            content: message,
            externalId: `instagram-${messageId}`,
            clientId: client.id,
            ticketId: ticketId || null,
            isRead: false,
            isDelivered: false,
          });

          await this.messagesRepository.save(savedMessage);

          this.logger.log(`Chatrace Instagram message sent: ${messageId} to ${recipientId}`);

          return {
            success: true,
            messageId,
            recipientId,
            message: savedMessage,
          };
        } catch (error: any) {
          // Если endpoint неверный, попробуем альтернативный формат
          this.logger.warn('First attempt failed, trying alternative format');
          
          // Альтернативный формат для Chatrace
          const altUrl = `${this.apiUrl}/instagram/send`;
          const altPayload = {
            to: recipientId,
            text: message,
          };

          const response = await firstValueFrom(
            this.httpService.post(altUrl, altPayload, {
              headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
              },
            }),
          );

          const messageId = response.data?.message_id || response.data?.id || `chatrace-${Date.now()}`;

          const savedMessage = this.messagesRepository.create({
            channel: MessageChannel.INSTAGRAM,
            direction: MessageDirection.OUTBOUND,
            content: message,
            externalId: `instagram-${messageId}`,
            clientId: client.id,
            ticketId: ticketId || null,
            isRead: false,
            isDelivered: false,
          });

          await this.messagesRepository.save(savedMessage);

          return {
            success: true,
            messageId,
            recipientId,
            message: savedMessage,
          };
        }
      } else {
        // Реальная отправка через Instagram Graph API
        const url = `${this.apiUrl}/${this.pageId}/messages`;

        const payload = {
          recipient: { id: recipientId },
          message: { text: message },
        };

        const response = await firstValueFrom(
          this.httpService.post(url, payload, {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
          }),
        );

        const messageId = response.data.message_id;

        // Сохраняем сообщение в БД
        const savedMessage = this.messagesRepository.create({
          channel: MessageChannel.INSTAGRAM,
          direction: MessageDirection.OUTBOUND,
          content: message,
          externalId: `instagram-${messageId}`,
          clientId: client.id,
          ticketId: ticketId || null,
          isRead: false,
          isDelivered: false,
        });

        await this.messagesRepository.save(savedMessage);

        this.logger.log(`Instagram message sent: ${messageId} to ${recipientId}`);

        return {
          success: true,
          messageId,
          recipientId,
          message: savedMessage,
        };
      }
    } catch (error: any) {
      this.logger.error('Error sending Instagram message:', error.response?.data || error.message);

      // Обработка rate limits
      if (error.response?.status === 429) {
        throw new BadRequestException('Превышен лимит запросов. Попробуйте позже.');
      }

      throw new BadRequestException(
        error.response?.data?.error?.message || 'Ошибка при отправке сообщения',
      );
    }
  }

  /**
   * Получить информацию о конфигурации
   */
  getConfig(): {
    apiUrl: string;
    pageId: string;
    accessToken: string;
    useMockMode: boolean;
    useChatrace: boolean;
    isConfigured: boolean;
  } {
    return {
      apiUrl: this.apiUrl,
      pageId: this.pageId || 'not set',
      accessToken: this.accessToken ? '***configured***' : 'not set',
      useMockMode: this.useMockMode,
      useChatrace: this.useChatrace,
      isConfigured: this.useMockMode || this.useChatrace || !!(this.accessToken && this.pageId),
    };
  }

  /**
   * Получить статистику Instagram сообщений (для диагностики)
   */
  async getStats(): Promise<{
    totalMessages: number;
    inboundMessages: number;
    outboundMessages: number;
    clientsWithInstagram: number;
    lastMessage?: {
      id: string;
      content: string;
      direction: string;
      createdAt: Date;
    };
    pollingActive: boolean;
    config: {
      useChatrace: boolean;
      useMockMode: boolean;
      hasAccessToken: boolean;
      apiUrl: string;
    };
  }> {
    const totalMessages = await this.messagesRepository.count({
      where: { channel: MessageChannel.INSTAGRAM },
    });

    const inboundMessages = await this.messagesRepository.count({
      where: {
        channel: MessageChannel.INSTAGRAM,
        direction: MessageDirection.INBOUND,
      },
    });

    const outboundMessages = await this.messagesRepository.count({
      where: {
        channel: MessageChannel.INSTAGRAM,
        direction: MessageDirection.OUTBOUND,
      },
    });

    const clientsWithInstagram = await this.clientsRepository
      .createQueryBuilder('client')
      .leftJoin('client.messages', 'message')
      .where('message.channel = :channel', { channel: MessageChannel.INSTAGRAM })
      .orWhere('client.instagramId IS NOT NULL')
      .getCount();

    const lastMessage = await this.messagesRepository.findOne({
      where: { channel: MessageChannel.INSTAGRAM },
      order: { createdAt: 'DESC' },
    });

    return {
      totalMessages,
      inboundMessages,
      outboundMessages,
      clientsWithInstagram,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            content: lastMessage.content,
            direction: lastMessage.direction,
            createdAt: lastMessage.createdAt,
          }
        : undefined,
      pollingActive: this.isPolling,
      config: {
        useChatrace: this.useChatrace,
        useMockMode: this.useMockMode,
        hasAccessToken: !!this.accessToken,
        apiUrl: this.apiUrl,
      },
    };
  }
}

