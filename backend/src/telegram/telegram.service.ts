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
import { AIService } from '../ai/ai.service';

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
    private aiService: AIService,
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
        this.logger.log('Starting Telegram bot...');
        await this.bot.launch();
        this.logger.log('Telegram bot started successfully');
        
        // Получаем информацию о боте
        const botInfo = await this.bot.telegram.getMe();
        this.logger.log(`Telegram bot @${botInfo.username} is ready`);
        this.logger.log(`Bot ID: ${botInfo.id}, Username: @${botInfo.username}`);
      } catch (error: any) {
        this.logger.error('Failed to start Telegram bot:', error);
        this.logger.error('Error details:', error.message || error);
        this.logger.error('Stack:', error.stack);
      }
    } else {
      this.logger.warn('Telegram bot not initialized. Check TELEGRAM_BOT_TOKEN environment variable.');
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
    this.logger.log('Setting up Telegram bot handlers...');
    
    // Обработка текстовых сообщений
    this.bot.on('text', async (ctx: Context) => {
      this.logger.log('Received text message in Telegram bot');
      await this.handleIncomingMessage(ctx);
    });

    // Обработка других типов сообщений
    this.bot.on('photo', async (ctx: Context) => {
      this.logger.log('Received photo message in Telegram bot');
      await this.handleIncomingMessage(ctx);
    });

    this.bot.on('video', async (ctx: Context) => {
      this.logger.log('Received video message in Telegram bot');
      await this.handleIncomingMessage(ctx);
    });

    this.bot.on('document', async (ctx: Context) => {
      this.logger.log('Received document message in Telegram bot');
      await this.handleIncomingMessage(ctx);
    });

    // Обработка всех сообщений (fallback)
    this.bot.on('message', async (ctx: Context) => {
      this.logger.log('Received message event in Telegram bot (fallback handler)');
      if (ctx.message && !('text' in ctx.message) && !('photo' in ctx.message) && !('video' in ctx.message) && !('document' in ctx.message)) {
        await this.handleIncomingMessage(ctx);
      }
    });

    // Обработка ошибок
    this.bot.catch((err: any, ctx) => {
      this.logger.error(`Error in Telegram bot: ${err?.message || err}`, err?.stack);
      try {
        if (ctx && ctx.reply) {
          ctx.reply('Произошла ошибка при обработке сообщения. Попробуйте позже.');
        }
      } catch (replyError) {
        this.logger.error('Failed to send error reply:', replyError);
      }
    });

    this.logger.log('Telegram bot handlers set up successfully');
  }

  /**
   * Обработка входящего сообщения
   */
  private async handleIncomingMessage(ctx: Context): Promise<void> {
    try {
      this.logger.log('Processing incoming Telegram message...');
      const message = ctx.message as TelegramMessage;
      if (!message) {
        this.logger.warn('No message in context, skipping');
        return;
      }

      const chatId = message.chat.id.toString();
      const messageId = message.message_id.toString();
      const userId = message.from?.id.toString();
      const username = message.from?.username || message.from?.first_name || 'Unknown';
      const timestamp = message.date * 1000; // Telegram возвращает Unix timestamp в секундах

      this.logger.log(`Processing message ${messageId} from ${username} (${chatId})`);

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
      this.logger.log(`Client found/created: ${client.id}, telegramId: ${client.telegramId}, name: ${client.name}`);

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
      this.logger.log(`Ticket found/created: ${ticket?.id || 'null'}`);

      // Сохраняем сообщение
      const messageToSave = {
        channel: MessageChannel.TELEGRAM,
        direction: MessageDirection.INBOUND,
        content,
        externalId: `telegram-${messageId}`,
        clientId: client.id,
        ticketId: ticket?.id || null,
        isRead: false,
        isDelivered: true,
        deliveredAt: new Date(timestamp),
      };

      this.logger.log(`[handleIncomingMessage] Saving message with data:`, JSON.stringify({
        channel: messageToSave.channel,
        direction: messageToSave.direction,
        clientId: messageToSave.clientId,
        ticketId: messageToSave.ticketId,
        contentLength: content.length,
        externalId: messageToSave.externalId,
        clientTelegramId: client.telegramId,
      }, null, 2));

      const savedMessage = this.messagesRepository.create(messageToSave);
      await this.messagesRepository.save(savedMessage);

      // Проверяем, что сообщение действительно сохранено и связано с клиентом
      const verifyMessage = await this.messagesRepository.findOne({
        where: { id: savedMessage.id },
        relations: ['client'],
      });

      if (verifyMessage) {
        this.logger.log(
          `✅ [handleIncomingMessage] Incoming Telegram message saved and verified: ${messageId} from ${username} (${chatId}), message ID in DB: ${savedMessage.id}, channel: ${savedMessage.channel}, direction: ${savedMessage.direction}, clientId: ${savedMessage.clientId}, clientTelegramId: ${verifyMessage.client?.telegramId || 'N/A'}`,
        );
        
        // Проверяем, что сообщение связано с правильным клиентом
        if (verifyMessage.clientId !== client.id) {
          this.logger.error(`❌ [handleIncomingMessage] Message clientId mismatch! Expected: ${client.id}, Got: ${verifyMessage.clientId}`);
        }
      } else {
        this.logger.error(`❌ [handleIncomingMessage] Message NOT found in DB after save! ID: ${savedMessage.id}`);
      }
      
      // Дополнительная проверка: ищем все сообщения этого клиента
      const clientMessagesCount = await this.messagesRepository.count({
        where: { clientId: client.id, channel: MessageChannel.TELEGRAM },
      });
      this.logger.log(`[handleIncomingMessage] Total Telegram messages for client ${client.id}: ${clientMessagesCount}`);

      // Автоматический вызов AI для входящих сообщений
      // Выполняем асинхронно, чтобы не блокировать обработку сообщения
      if (content && content.trim() && client) {
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
                message: content,
                clientId: client.id,
                userId: null, // Системный вызов
              });

              if (aiResponse && aiResponse.response) {
                this.logger.log(`✅ AI сгенерировал ответ: ${aiResponse.response.substring(0, 100)}...`);
                
                // Отправляем ответ клиенту
                await this.sendMessage({
                  chatId: chatId,
                  message: aiResponse.response,
                  ticketId: ticket?.id || null,
                }, null); // null user = системный вызов
                
                this.logger.log(`✅ AI ответ отправлен клиенту ${chatId}`);
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

    this.logger.log(`[findOrCreateClient] Looking for client with telegramId: ${userId}, chatId: ${chatId}, username: ${username}`);

    // Ищем клиента по Telegram ID
    let client = await this.clientsRepository.findOne({
      where: { telegramId: userId },
    });

    if (!client) {
      // Также пробуем найти по chatId, если он отличается
      if (chatId !== userId) {
        client = await this.clientsRepository.findOne({
          where: { telegramId: chatId },
        });
      }

      if (!client) {
        // Создаем нового клиента
        const name = username !== 'Unknown' ? username : `Telegram ${userId}`;

        this.logger.log(`[findOrCreateClient] Creating new client for Telegram user ${userId} (chatId: ${chatId})`);
        client = this.clientsRepository.create({
          name,
          telegramId: userId,
          status: 'active',
        });

        client = await this.clientsRepository.save(client);
        this.logger.log(`[findOrCreateClient] ✅ Created new client: ${client.id} for Telegram user ${userId}, telegramId: ${client.telegramId}`);
      } else {
        this.logger.log(`[findOrCreateClient] Found client by chatId: ${client.id}, telegramId: ${client.telegramId}`);
      }
    } else {
      this.logger.log(`[findOrCreateClient] Found existing client: ${client.id}, telegramId: ${client.telegramId}, name: ${client.name}`);
      
      // Обновляем имя, если оно было передано и отличается
      if (username !== 'Unknown' && client.name !== username && !client.name.includes('Telegram')) {
        client.name = username;
        await this.clientsRepository.save(client);
        this.logger.log(`[findOrCreateClient] Updated client name to: ${username}`);
      }
    }

    // Проверяем, что clientId правильный
    if (!client.id) {
      this.logger.error(`[findOrCreateClient] ❌ Client has no ID!`, client);
      throw new Error('Client has no ID');
    }

    this.logger.log(`[findOrCreateClient] Returning client: ${client.id}, telegramId: ${client.telegramId}`);
    return client;
  }

  /**
   * Найти или создать тикет для клиента
   */
  private async findOrCreateTicket(client: Client): Promise<Ticket | null> {
    // Ищем открытый тикет для этого клиента в Telegram (NEW или IN_PROGRESS)
    let ticket = await this.ticketsRepository.findOne({
      where: [
        {
          clientId: client.id,
          channel: TicketChannel.TELEGRAM,
          status: TicketStatus.NEW,
        },
        {
          clientId: client.id,
          channel: TicketChannel.TELEGRAM,
          status: TicketStatus.IN_PROGRESS,
        },
      ],
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
  async sendMessage(sendMessageDto: SendTelegramMessageDto, user: User | null): Promise<any> {
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


