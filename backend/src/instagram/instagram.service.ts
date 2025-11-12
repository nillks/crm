import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
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
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);
  private readonly useMockMode: boolean;
  private readonly apiUrl: string;
  private readonly accessToken: string;
  private readonly pageId: string;
  private readonly useChatrace: boolean;

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
  ) {
    this.apiUrl = this.configService.get('INSTAGRAM_API_URL', 'https://api.chatrace.com');
    this.accessToken = this.configService.get('INSTAGRAM_ACCESS_TOKEN', '');
    this.pageId = this.configService.get('INSTAGRAM_PAGE_ID', '');
    this.useMockMode = this.configService.get('INSTAGRAM_USE_MOCK', 'false') === 'true';
    this.useChatrace = this.configService.get('INSTAGRAM_USE_CHATRACE', 'true') === 'true';

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
        ticketId: ticket.id,
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
      // Chatrace обычно отправляет данные в формате, похожем на Instagram Graph API
      // Адаптируем под их формат
      const senderId = data.sender?.id || data.from?.id || data.userId || data.senderId;
      const messageId = data.message?.mid || data.messageId || data.id || `chatrace-${Date.now()}`;
      const text = data.message?.text || data.text || data.message || data.content || '';
      const username = data.sender?.username || data.from?.username || data.username || `Chatrace User ${senderId}`;
      const timestamp = data.timestamp || data.time || Date.now();

      if (!senderId || !text) {
        this.logger.warn('Chatrace webhook data incomplete, skipping');
        return;
      }

      // Находим или создаем клиента
      const client = await this.findOrCreateClient(senderId, username);

      // Проверяем дубликаты
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
        ticketId: ticket.id,
        isRead: false,
        isDelivered: true,
        deliveredAt: new Date(timestamp),
      });

      await this.messagesRepository.save(savedMessage);

      this.logger.log(`Chatrace Instagram message processed: ${messageId} from ${username}`);
    } catch (error) {
      this.logger.error('Error processing Chatrace webhook:', error);
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
            ticketId: ticket.id,
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
  private async findOrCreateTicket(client: Client): Promise<Ticket> {
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
        throw new NotFoundException('Admin user not found for ticket creation');
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
  async sendMessage(sendMessageDto: SendInstagramMessageDto, user: User): Promise<any> {
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
}

