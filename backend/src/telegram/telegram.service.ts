import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Telegraf, Context } from 'telegraf';
import { Message as TelegramMessage } from 'telegraf/typings/core/types/typegram';
import { Message, MessageChannel, MessageDirection } from '../entities/message.entity';
import { Client } from '../entities/client.entity';
import { Ticket, TicketStatus, TicketChannel } from '../entities/ticket.entity';
import { User } from '../entities/user.entity';
import { RoleName } from '../entities/role.entity';
import { SendTelegramMessageDto } from './dto/send-message.dto';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf;
  private readonly botToken: string;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {
    this.botToken = this.configService.get('TELEGRAM_BOT_TOKEN', '');

    if (!this.botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set. Telegram bot will not be initialized.');
    } else {
      this.bot = new Telegraf(this.botToken);
      this.setupHandlers();
    }
  }

  async onModuleInit() {
    if (this.bot && this.botToken) {
      try {
        await this.bot.launch();
        this.logger.log('Telegram bot started successfully');
        
        // Получаем информацию о боте
        const botInfo = await this.bot.telegram.getMe();
        this.logger.log(`Telegram bot @${botInfo.username} is ready`);
      } catch (error) {
        this.logger.error('Failed to start Telegram bot:', error);
      }
    }
  }

  async onModuleDestroy() {
    if (this.bot) {
      this.bot.stop('SIGTERM');
      this.logger.log('Telegram bot stopped');
    }
  }

  /**
   * Настройка обработчиков сообщений
   */
  private setupHandlers() {
    // Обработка текстовых сообщений
    this.bot.on('text', async (ctx: Context) => {
      await this.handleIncomingMessage(ctx);
    });

    // Обработка других типов сообщений
    this.bot.on('photo', async (ctx: Context) => {
      await this.handleIncomingMessage(ctx);
    });

    this.bot.on('video', async (ctx: Context) => {
      await this.handleIncomingMessage(ctx);
    });

    this.bot.on('document', async (ctx: Context) => {
      await this.handleIncomingMessage(ctx);
    });

    // Обработка ошибок
    this.bot.catch((err: any, ctx) => {
      this.logger.error(`Error in Telegram bot: ${err?.message || err}`, err?.stack);
      ctx.reply('Произошла ошибка при обработке сообщения. Попробуйте позже.');
    });
  }

  /**
   * Обработка входящего сообщения
   */
  private async handleIncomingMessage(ctx: Context): Promise<void> {
    try {
      const message = ctx.message as TelegramMessage;
      if (!message) return;

      const chatId = message.chat.id.toString();
      const messageId = message.message_id.toString();
      const userId = message.from?.id.toString();
      const username = message.from?.username || message.from?.first_name || 'Unknown';
      const timestamp = message.date * 1000; // Telegram возвращает Unix timestamp в секундах

      // Извлекаем текст сообщения
      let content = '';
      if ('text' in message) {
        content = message.text;
      } else if ('photo' in message) {
        content = message.caption || '[Изображение]';
      } else if ('video' in message) {
        content = message.caption || '[Видео]';
      } else if ('document' in message) {
        content = message.caption || `[Документ: ${message.document.file_name || 'файл'}]`;
      } else {
        content = '[Неподдерживаемый тип сообщения]';
      }

      // Находим или создаем клиента
      const client = await this.findOrCreateClient(userId, username, chatId);

      // Проверяем, не существует ли уже сообщение с таким externalId
      const existingMessage = await this.messagesRepository.findOne({
        where: { externalId: `telegram-${messageId}` },
      });

      if (existingMessage) {
        this.logger.warn(`Message telegram-${messageId} already exists, skipping`);
        return;
      }

      // Находим или создаем тикет
      const ticket = await this.findOrCreateTicket(client);

      // Сохраняем сообщение
      const savedMessage = this.messagesRepository.create({
        channel: MessageChannel.TELEGRAM,
        direction: MessageDirection.INBOUND,
        content,
        externalId: `telegram-${messageId}`,
        clientId: client.id,
        ticketId: ticket?.id || null,
        isRead: false,
        isDelivered: true,
        deliveredAt: new Date(timestamp),
      });

      await this.messagesRepository.save(savedMessage);

      this.logger.log(
        `Incoming Telegram message processed: ${messageId} from ${username} (${chatId})`,
      );
    } catch (error) {
      this.logger.error('Error processing incoming Telegram message:', error);
    }
  }

  /**
   * Найти или создать клиента по Telegram ID
   */
  private async findOrCreateClient(
    userId: string | undefined,
    username: string,
    chatId: string,
  ): Promise<Client> {
    if (!userId) {
      userId = chatId;
    }

    // Ищем клиента по Telegram ID
    let client = await this.clientsRepository.findOne({
      where: { telegramId: userId },
    });

    if (!client) {
      // Создаем нового клиента
      const name = username !== 'Unknown' ? username : `Telegram ${userId}`;

      client = this.clientsRepository.create({
        name,
        telegramId: userId,
        status: 'active',
      });

      client = await this.clientsRepository.save(client);
      this.logger.log(`Created new client: ${client.id} for Telegram user ${userId}`);
    } else {
      // Обновляем имя, если оно было передано и отличается
      if (username !== 'Unknown' && client.name !== username && !client.name.includes('Telegram')) {
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
    // Ищем открытый тикет для этого клиента в Telegram
    let ticket = await this.ticketsRepository.findOne({
      where: {
        clientId: client.id,
        channel: TicketChannel.TELEGRAM,
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
        title: `Telegram сообщение от ${client.name}`,
        description: 'Тикет создан автоматически из входящего сообщения Telegram',
        clientId: client.id,
        createdById: adminUser.id,
        channel: TicketChannel.TELEGRAM,
        status: TicketStatus.NEW,
        priority: 0,
      });

      ticket = await this.ticketsRepository.save(ticket);
      this.logger.log(`Created new ticket: ${ticket.id} for client ${client.id}`);
    }

    return ticket;
  }

  /**
   * Отправить сообщение через Telegram Bot API
   */
  async sendMessage(sendMessageDto: SendTelegramMessageDto, user: User): Promise<any> {
    try {
      const { chatId, message, ticketId } = sendMessageDto;

      if (!this.bot) {
        throw new BadRequestException('Telegram bot не инициализирован. Проверьте TELEGRAM_BOT_TOKEN.');
      }

      // Находим клиента по chatId или telegramId
      let client = await this.clientsRepository.findOne({
        where: [
          { telegramId: chatId },
        ],
      });

      if (!client) {
        throw new NotFoundException(`Клиент с Telegram ID ${chatId} не найден`);
      }

      // Отправляем сообщение через Telegram API
      const sentMessage = await this.bot.telegram.sendMessage(chatId, message);

      // Сохраняем сообщение в БД
      const savedMessage = this.messagesRepository.create({
        channel: MessageChannel.TELEGRAM,
        direction: MessageDirection.OUTBOUND,
        content: message,
        externalId: `telegram-${sentMessage.message_id}`,
        clientId: client.id,
        ticketId: ticketId || null,
        isRead: false,
        isDelivered: false,
      });

      await this.messagesRepository.save(savedMessage);

      this.logger.log(`Telegram message sent: ${sentMessage.message_id} to ${chatId}`);

      return {
        success: true,
        messageId: sentMessage.message_id.toString(),
        chatId: sentMessage.chat.id.toString(),
        message: savedMessage,
      };
    } catch (error: any) {
      this.logger.error('Error sending Telegram message:', error.message);

      // Обработка rate limits
      if (error.response?.error_code === 429) {
        throw new BadRequestException('Превышен лимит запросов. Попробуйте позже.');
      }

      // Обработка других ошибок Telegram API
      if (error.response) {
        const errorMessage = error.response.description || 'Ошибка при отправке сообщения';
        throw new BadRequestException(errorMessage);
      }

      throw new BadRequestException(error.message || 'Ошибка при отправке сообщения');
    }
  }

  /**
   * Получить информацию о конфигурации (без секретных данных)
   */
  getConfig(): {
    botToken: string;
    isConfigured: boolean;
    botUsername?: string;
  } {
    return {
      botToken: this.botToken ? '***configured***' : 'not set',
      isConfigured: !!this.botToken,
    };
  }
}

