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
import { Role, RoleName } from '../entities/role.entity';
import { SendMessageDto } from './dto/send-message.dto';

// Green API webhook format
interface GreenAPIWebhook {
  typeWebhook: string; // 'incomingMessageReceived' | 'outgoingMessageStatus' | 'stateInstanceChanged' | etc.
  timestamp: number;
  idMessage?: string;
  instanceData?: {
    idInstance: number;
    wid: string;
    typeInstance: string;
  };
  data?: {
    typeMessage?: string; // 'textMessage' | 'imageMessage' | 'videoMessage' | 'documentMessage' | etc.
    chatId?: string; // "79001234567@c.us"
    senderId?: string; // "79001234567@c.us"
    senderName?: string;
    textMessage?: string;
    timestamp?: number;
    idMessage?: string;
    status?: string; // 'sent' | 'delivered' | 'read' | 'failed'
    statusMessage?: string;
    downloadUrl?: string;
    caption?: string;
    fileName?: string;
    mimeType?: string;
  };
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl: string;
  private readonly idInstance: string;
  private readonly apiTokenInstance: string;
  private readonly phoneNumber: string;

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
    this.apiUrl = this.configService.get('WHATSAPP_API_URL', '');
    this.idInstance = this.configService.get('WHATSAPP_ID_INSTANCE', '');
    this.apiTokenInstance = this.configService.get('WHATSAPP_API_TOKEN_INSTANCE', '');
    this.phoneNumber = this.configService.get('WHATSAPP_PHONE_NUMBER', '');

    // Логируем конфигурацию при старте (без секретных данных)
    this.logger.log(`WhatsApp Service initialized (Green API)`);
    this.logger.log(`API URL: ${this.apiUrl || 'NOT SET'}`);
    this.logger.log(`ID Instance: ${this.idInstance || 'NOT SET'}`);
    this.logger.log(`API Token: ${this.apiTokenInstance ? 'SET' : 'NOT SET'}`);
    this.logger.log(`Phone Number: ${this.phoneNumber || 'NOT SET'}`);

    if (!this.apiUrl || !this.idInstance || !this.apiTokenInstance) {
      this.logger.warn('WhatsApp credentials not fully configured. Please check .env file.');
    }
  }

  /**
   * Верификация webhook для Green API (не требуется, но оставляем для совместимости)
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    // Green API не требует верификации через GET запрос
    // Webhook настраивается в личном кабинете Green API
    this.logger.log('Webhook verification called (Green API does not require this)');
    return challenge;
  }

  /**
   * Обработка входящего webhook от Green API
   */
  async handleWebhook(webhookData: GreenAPIWebhook): Promise<void> {
    try {
      this.logger.log(`Received webhook from Green API: ${webhookData.typeWebhook}`);
      this.logger.debug(`Webhook data: ${JSON.stringify(webhookData, null, 2)}`);

      // Green API может отправлять массив webhook'ов или один объект
      let webhooks: GreenAPIWebhook[] = [];
      if (Array.isArray(webhookData)) {
        webhooks = webhookData as any;
      } else if (webhookData.typeWebhook) {
        webhooks = [webhookData];
      } else {
        // Возможно, данные приходят в другом формате
        this.logger.warn(`Unexpected webhook format: ${JSON.stringify(webhookData)}`);
        // Пытаемся обработать как один webhook
        webhooks = [webhookData as any];
      }

      for (const webhook of webhooks) {
        switch (webhook.typeWebhook) {
          case 'incomingMessageReceived':
            await this.processIncomingMessage(webhook);
            break;
          case 'outgoingMessageStatus':
            await this.processStatusUpdate(webhook);
            break;
          case 'stateInstanceChanged':
            this.logger.log(`Instance state changed: ${JSON.stringify(webhook.data)}`);
            break;
          default:
            this.logger.log(`Unhandled webhook type: ${webhook.typeWebhook}`);
        }
      }
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      this.logger.error(`Webhook data that caused error: ${JSON.stringify(webhookData, null, 2)}`);
      throw error;
    }
  }

  /**
   * Обработка входящего сообщения от Green API
   */
  private async processIncomingMessage(webhookData: GreenAPIWebhook): Promise<void> {
    try {
      this.logger.debug(`Processing incoming message: ${JSON.stringify(webhookData, null, 2)}`);
      
      const data = webhookData.data;
      if (!data) {
        this.logger.warn('Webhook data is empty');
        this.logger.warn(`Full webhook: ${JSON.stringify(webhookData, null, 2)}`);
        return;
      }

      // Green API может использовать разные поля для идентификации отправителя
      const chatId = data.chatId || data.senderId || data.sender || data.from;
      if (!chatId) {
        this.logger.warn('ChatId is missing in webhook data');
        this.logger.warn(`Available data fields: ${Object.keys(data).join(', ')}`);
        this.logger.warn(`Full data: ${JSON.stringify(data, null, 2)}`);
        return;
      }
      
      this.logger.log(`Processing message from chatId: ${chatId}`);

      // Извлекаем номер телефона из chatId (формат: "79001234567@c.us")
      const phoneNumber = chatId.split('@')[0];
      const messageId = data.idMessage || webhookData.idMessage;
      const timestamp = data.timestamp || webhookData.timestamp || Date.now();

      // Извлекаем текст сообщения в зависимости от типа
      let content = '';
      if (data.typeMessage === 'textMessage') {
        content = data.textMessage || '';
      } else if (data.typeMessage === 'imageMessage') {
        content = data.caption || '[Изображение]';
      } else if (data.typeMessage === 'videoMessage') {
        content = data.caption || '[Видео]';
      } else if (data.typeMessage === 'documentMessage') {
        content = data.caption || `[Документ: ${data.fileName || 'файл'}]`;
      } else {
        content = `[${data.typeMessage || 'Неподдерживаемый тип сообщения'}]`;
      }

      if (!content && !messageId) {
        this.logger.warn('Message content and ID are both empty');
        return;
      }

      // Находим или создаем клиента
      const client = await this.findOrCreateClient(phoneNumber, data.senderName);

      // Проверяем, не существует ли уже сообщение с таким externalId
      if (messageId) {
        const existingMessage = await this.messagesRepository.findOne({
          where: { externalId: messageId },
        });

        if (existingMessage) {
          this.logger.warn(`Message ${messageId} already exists, skipping`);
          return;
        }
      }

      // Находим или создаем тикет
      const ticket = await this.findOrCreateTicket(client);

      // Сохраняем сообщение
      const savedMessage = this.messagesRepository.create({
        channel: MessageChannel.WHATSAPP,
        direction: MessageDirection.INBOUND,
        content: content || '[Сообщение без текста]',
        externalId: messageId || `green-${Date.now()}`,
        clientId: client.id,
        ticketId: ticket.id,
        isRead: false,
        isDelivered: true,
        deliveredAt: new Date(timestamp * 1000),
      });

      await this.messagesRepository.save(savedMessage);

      this.logger.log(
        `Incoming message processed: ${messageId} from ${phoneNumber} (${data.senderName || 'Unknown'})`,
      );
    } catch (error) {
      this.logger.error('Error processing incoming message:', error);
      throw error;
    }
  }

  /**
   * Обработка обновления статуса сообщения от Green API
   */
  private async processStatusUpdate(webhookData: GreenAPIWebhook): Promise<void> {
    try {
      const data = webhookData.data;
      if (!data) {
        return;
      }

      const messageId = data.idMessage || webhookData.idMessage;
      const statusValue = data.status; // sent, delivered, read, failed

      if (!messageId) {
        this.logger.warn('Message ID is missing in status update');
        return;
      }

      const message = await this.messagesRepository.findOne({
        where: { externalId: messageId },
      });

      if (!message) {
        this.logger.warn(`Message ${messageId} not found for status update`);
        return;
      }

      // Обновляем статус доставки
      if (statusValue === 'delivered' || statusValue === 'read') {
        message.isDelivered = true;
        const timestamp = data.timestamp || webhookData.timestamp || Date.now();
        message.deliveredAt = new Date(timestamp * 1000);
      }

      if (statusValue === 'read') {
        message.isRead = true;
      }

      await this.messagesRepository.save(message);

      this.logger.log(`Status updated for message ${messageId}: ${statusValue}`);
    } catch (error) {
      this.logger.error('Error processing status update:', error);
    }
  }

  /**
   * Найти или создать клиента по номеру телефона
   */
  private async findOrCreateClient(
    phoneNumber: string,
    senderName?: string,
  ): Promise<Client> {
    // Нормализуем номер телефона (убираем + и пробелы)
    const normalizedPhone = phoneNumber.replace(/[+\s]/g, '');

    // Ищем клиента по номеру телефона или WhatsApp ID
    let client = await this.clientsRepository.findOne({
      where: [
        { phone: normalizedPhone },
        { whatsappId: normalizedPhone },
      ],
    });

    if (!client) {
      // Используем имя отправителя или создаем имя из номера
      const name = senderName || `WhatsApp ${normalizedPhone}`;

      // Создаем нового клиента
      client = this.clientsRepository.create({
        name,
        phone: normalizedPhone,
        whatsappId: normalizedPhone,
        status: 'active',
      });

      client = await this.clientsRepository.save(client);
      this.logger.log(`Created new client: ${client.id} for phone ${normalizedPhone}`);
    } else {
      // Обновляем WhatsApp ID, если его нет
      if (!client.whatsappId) {
        client.whatsappId = normalizedPhone;
        await this.clientsRepository.save(client);
      }
      // Обновляем имя, если оно было передано и отличается
      if (senderName && client.name !== senderName && !client.name.includes('WhatsApp')) {
        client.name = senderName;
        await this.clientsRepository.save(client);
      }
    }

    return client;
  }

  /**
   * Найти или создать тикет для клиента
   */
  private async findOrCreateTicket(client: Client): Promise<Ticket> {
    // Ищем открытый тикет для этого клиента в WhatsApp
    let ticket = await this.ticketsRepository.findOne({
      where: {
        clientId: client.id,
        channel: TicketChannel.WHATSAPP,
        status: TicketStatus.NEW,
      },
      order: { createdAt: 'DESC' },
    });

    if (!ticket) {
      // Создаем новый тикет
      // Для создания тикета нужен createdBy, но в webhook нет пользователя
      // Используем системного пользователя или первого админа
      const adminUser = await this.usersRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .where('role.name = :roleName', { roleName: RoleName.ADMIN })
        .getOne();

      if (!adminUser) {
        throw new NotFoundException('Admin user not found for ticket creation');
      }

      ticket = this.ticketsRepository.create({
        title: `WhatsApp сообщение от ${client.name}`,
        description: 'Тикет создан автоматически из входящего сообщения WhatsApp',
        clientId: client.id,
        createdById: adminUser.id,
        channel: TicketChannel.WHATSAPP,
        status: TicketStatus.NEW,
        priority: 0,
      });

      ticket = await this.ticketsRepository.save(ticket);
      this.logger.log(`Created new ticket: ${ticket.id} for client ${client.id}`);
    }

    return ticket;
  }

  /**
   * Отправить сообщение через Green API
   */
  async sendMessage(sendMessageDto: SendMessageDto, user: User): Promise<any> {
    try {
      const { phoneNumber, message, ticketId } = sendMessageDto;

      // Нормализуем номер телефона (убираем + и пробелы)
      const normalizedPhone = phoneNumber.replace(/[+\s]/g, '');

      // Находим или создаем клиента
      let client = await this.clientsRepository.findOne({
        where: [
          { phone: normalizedPhone },
          { whatsappId: normalizedPhone },
        ],
      });

      if (!client) {
        throw new NotFoundException(`Клиент с номером ${phoneNumber} не найден`);
      }

      // Формируем chatId для Green API (формат: "79001234567@c.us")
      const chatId = `${normalizedPhone}@c.us`;

      // Формируем URL для отправки сообщения через Green API
      const url = `${this.apiUrl}/waInstance${this.idInstance}/sendMessage/${this.apiTokenInstance}`;

      // Формируем payload для Green API
      const payload = {
        chatId: chatId,
        message: message,
      };

      // Отправляем запрос
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      const messageId = response.data?.idMessage;

      if (!messageId) {
        throw new BadRequestException('Не удалось получить ID сообщения от Green API');
      }

      // Сохраняем сообщение в БД
      const savedMessage = this.messagesRepository.create({
        channel: MessageChannel.WHATSAPP,
        direction: MessageDirection.OUTBOUND,
        content: message,
        externalId: messageId,
        clientId: client.id,
        ticketId: ticketId || null,
        isRead: false,
        isDelivered: false,
      });

      await this.messagesRepository.save(savedMessage);

      this.logger.log(`Message sent: ${messageId} to ${phoneNumber}`);

      return {
        success: true,
        messageId,
        message: savedMessage,
      };
    } catch (error: any) {
      this.logger.error('Error sending message:', error.response?.data || error.message);

      // Обработка rate limits
      if (error.response?.status === 429) {
        throw new BadRequestException('Превышен лимит запросов. Попробуйте позже.');
      }

      // Обработка ошибок Green API
      if (error.response?.data) {
        const errorMessage = error.response.data.error || error.response.data.message || 'Ошибка при отправке сообщения';
        throw new BadRequestException(errorMessage);
      }

      throw new BadRequestException(
        error.message || 'Ошибка при отправке сообщения',
      );
    }
  }

  /**
   * Получить информацию о конфигурации (без секретных данных)
   */
  getConfig(): {
    apiUrl: string;
    idInstance: string;
    phoneNumber: string;
    apiToken: string;
    isConfigured: boolean;
  } {
    return {
      apiUrl: this.apiUrl,
      idInstance: this.idInstance,
      phoneNumber: this.phoneNumber,
      apiToken: this.apiTokenInstance ? '***configured***' : 'not set',
      isConfigured: !!(this.apiUrl && this.idInstance && this.apiTokenInstance),
    };
  }
}

