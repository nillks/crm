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
import { Repository, Not, IsNull, Between } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { Message, MessageChannel, MessageDirection } from '../entities/message.entity';
import { Client } from '../entities/client.entity';
import { Ticket, TicketStatus, TicketChannel } from '../entities/ticket.entity';
import { User } from '../entities/user.entity';
import { Role, RoleName } from '../entities/role.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { AIService } from '../ai/ai.service';

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
    sender?: string; // Альтернативное поле для senderId
    from?: string; // Альтернативное поле для senderId
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
    [key: string]: any; // Разрешаем дополнительные поля
  };
}

@Injectable()
export class WhatsAppService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl: string;
  private readonly idInstance: string;
  private readonly apiTokenInstance: string;
  private readonly phoneNumber: string;
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
   * Инициализация polling для получения сообщений
   */
  async onModuleInit() {
    this.logger.log('🔧 WhatsAppService onModuleInit called');
    this.logger.log(`API URL: ${this.apiUrl || 'NOT SET'}`);
    this.logger.log(`ID Instance: ${this.idInstance || 'NOT SET'}`);
    this.logger.log(`API Token: ${this.apiTokenInstance ? 'SET' : 'NOT SET'}`);
    
    if (this.apiUrl && this.idInstance && this.apiTokenInstance) {
      this.logger.log('✅ Starting WhatsApp message polling...');
      this.startPolling();
    } else {
      this.logger.warn('❌ WhatsApp polling not started - credentials not configured');
      this.logger.warn('Please check .env file for: WHATSAPP_API_URL, WHATSAPP_ID_INSTANCE, WHATSAPP_API_TOKEN_INSTANCE');
    }
  }

  /**
   * Остановка polling при выключении модуля
   */
  async onModuleDestroy() {
    this.stopPolling();
  }

  /**
   * Запуск polling для получения сообщений через receiveNotification
   */
  private startPolling() {
    if (this.pollingInterval) {
      return; // Уже запущен
    }

    this.isPolling = true;
    this.logger.log('✅ WhatsApp polling started (checking every 5 seconds)');
    this.logger.log(`📡 Polling URL: ${this.apiUrl}/waInstance${this.idInstance}/receiveNotification/${this.apiTokenInstance?.substring(0, 10)}...`);

    // Проверяем сообщения каждые 5 секунд
    this.pollingInterval = setInterval(async () => {
      if (!this.isPolling) return;
      
      try {
        await this.checkForNewMessages();
      } catch (error) {
        this.logger.error('❌ Error in polling cycle:', error);
      }
    }, 5000);

    // Первая проверка сразу
    this.logger.log('🔍 Performing initial message check...');
    this.checkForNewMessages().catch((error) => {
      this.logger.error('❌ Error in initial polling:', error);
    });
  }

  /**
   * Остановка polling
   */
  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.isPolling = false;
      this.logger.log('WhatsApp polling stopped');
    }
  }

  /**
   * Проверка новых сообщений через receiveNotification
   * Публичный метод для тестирования
   */
  async checkForNewMessages(): Promise<void> {
    try {
      const url = `${this.apiUrl}/waInstance${this.idInstance}/receiveNotification/${this.apiTokenInstance}`;
      this.logger.debug(`🔍 Checking for new messages: ${url}`);
      
      // Увеличиваем timeout до 30 секунд, так как Green API может долго отвечать
      const response = await firstValueFrom(
        this.httpService.get(url, {
          timeout: 30000, // 30 секунд
        })
      );

      if (!response.data) {
        this.logger.debug('📭 No new notifications');
        return; // Нет новых уведомлений
      }

      const notification = response.data;
      this.logger.log(`📬 Received notification from Green API: ${JSON.stringify(notification, null, 2)}`);

      // receiveNotification возвращает объект с receiptId и body
      // body содержит данные уведомления (typeWebhook, messageData и т.д.)
      if (notification.body) {
        this.logger.log(`📦 Processing notification body: ${JSON.stringify(notification.body, null, 2)}`);
        await this.processNotification(notification.body);
      } else {
        this.logger.warn(`⚠️ Notification body is empty: ${JSON.stringify(notification, null, 2)}`);
      }

      // Удаляем уведомление после обработки
      if (notification.receiptId) {
        await this.deleteNotification(notification.receiptId);
      } else {
        this.logger.warn(`⚠️ Notification receiptId is missing`);
      }
    } catch (error: any) {
      // 404 означает, что нет новых уведомлений - это нормально
      if (error.response?.status === 404) {
        // Не логируем 404, это нормально
        return;
      }
      
      // Timeout ошибки - логируем, но не критично
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        this.logger.warn(`⏱️ Request timeout (this is normal for long polling): ${error.message}`);
        return;
      }
      
      // Другие ошибки логируем
      if (error.response?.status !== 404) {
        this.logger.error(`❌ Error checking for messages: ${error.message}`);
        this.logger.error(`❌ Error response: ${JSON.stringify(error.response?.data, null, 2)}`);
        this.logger.error(`❌ Error status: ${error.response?.status}`);
      }
    }
  }

  /**
   * Удаление обработанного уведомления
   */
  private async deleteNotification(receiptId: string): Promise<void> {
    try {
      const url = `${this.apiUrl}/waInstance${this.idInstance}/deleteNotification/${this.apiTokenInstance}/${receiptId}`;
      
      await firstValueFrom(
        this.httpService.delete(url, {
          timeout: 5000,
        })
      );
      
      this.logger.debug(`Deleted notification: ${receiptId}`);
    } catch (error: any) {
      this.logger.warn(`Error deleting notification ${receiptId}: ${error.message}`);
    }
  }

  /**
   * Обработка уведомления от Green API
   */
  private async processNotification(notificationBody: any): Promise<void> {
    try {
      this.logger.log(`🔄 Processing notification: ${JSON.stringify(notificationBody, null, 2)}`);
      
      // Обрабатываем quotaExceeded отдельно - это информационное уведомление
      if (notificationBody.typeWebhook === 'quotaExceeded') {
        const quotaData = notificationBody.quotaData;
        if (quotaData) {
          this.logger.warn(`⚠️ Quota exceeded: ${quotaData.description || 'Monthly quota has been exceeded'}`);
          this.logger.warn(`📊 Used: ${quotaData.used}/${quotaData.total} (${quotaData.method})`);
          if (quotaData.description) {
            const allowedContacts = quotaData.description.split('numbers: ')[1]?.split('.')[0] || 'N/A';
            this.logger.warn(`ℹ️ Allowed contacts: ${allowedContacts}`);
          }
        }
        return; // Не обрабатываем как сообщение
      }
      
      // receiveNotification возвращает body в формате:
      // {
      //   typeWebhook: "incomingMessageReceived",
      //   instanceData: {...},
      //   timestamp: 1234567890,
      //   idMessage: "...",
      //   senderData: {...},
      //   messageData: {...}
      // }
      
      // Формируем webhook-подобный объект для совместимости с существующей логикой
      const webhookData: GreenAPIWebhook = {
        typeWebhook: notificationBody.typeWebhook || notificationBody.type || 'incomingMessageReceived',
        timestamp: notificationBody.timestamp || Date.now(),
        idMessage: notificationBody.idMessage || notificationBody.messageData?.idMessage,
        instanceData: notificationBody.instanceData,
        // Данные сообщения могут быть в messageData или напрямую в body
        data: {
          // Сначала базовые данные из messageData (включая все вложенные объекты)
          // ВАЖНО: Распаковываем messageData ПЕРВЫМ, чтобы все его поля были доступны
          ...(notificationBody.messageData || {}),
          // Затем senderData (важно для outgoingMessageReceived)
          ...(notificationBody.senderData || {}),
          // Если данные уже в правильном формате, используем их
          ...(notificationBody.data || {}),
          // Убеждаемся, что основные поля на месте (приоритет senderData для outgoingMessageReceived)
          // ВАЖНО: Для входящих сообщений textMessage может быть напрямую в messageData
          // ИЛИ в messageData.textMessageData.textMessage (согласно документации Green API)
          typeMessage: notificationBody.messageData?.typeMessage || notificationBody.typeMessage || notificationBody.type,
          textMessage: notificationBody.messageData?.textMessageData?.textMessage ||
                      notificationBody.messageData?.textMessage || 
                      notificationBody.textMessage || 
                      notificationBody.messageData?.text ||
                      notificationBody.text,
          chatId: notificationBody.senderData?.chatId || notificationBody.messageData?.chatId || notificationBody.chatId,
          senderId: notificationBody.senderData?.senderId || notificationBody.messageData?.senderId || notificationBody.senderId,
          sender: notificationBody.senderData?.sender || notificationBody.sender,
          senderName: notificationBody.senderData?.senderName || notificationBody.messageData?.senderName || notificationBody.senderName,
          idMessage: notificationBody.idMessage || notificationBody.messageData?.idMessage,
          timestamp: notificationBody.timestamp || notificationBody.messageData?.timestamp,
          // Сохраняем все вложенные данные из messageData (extendedTextMessageData, fileMessageData и т.д.)
          // ВАЖНО: textMessageData содержит textMessage для текстовых сообщений
          textMessageData: notificationBody.messageData?.textMessageData,
          extendedTextMessageData: notificationBody.messageData?.extendedTextMessageData,
          fileMessageData: notificationBody.messageData?.fileMessageData,
          imageMessageData: notificationBody.messageData?.imageMessageData,
          videoMessageData: notificationBody.messageData?.videoMessageData,
          audioMessageData: notificationBody.messageData?.audioMessageData,
          documentMessageData: notificationBody.messageData?.documentMessageData,
          quotedMessageData: notificationBody.messageData?.quotedMessageData,
          reactionMessageData: notificationBody.messageData?.reactionMessageData,
          contactMessageData: notificationBody.messageData?.contactMessageData,
          locationMessageData: notificationBody.messageData?.locationMessageData,
          // ВАЖНО: Для групповых чатов текст может быть в messageData напрямую
          // Сохраняем messageData целиком для доступа ко всем полям
          messageData: notificationBody.messageData,
          // Сохраняем senderData для доступа в processIncomingMessage
          senderData: notificationBody.senderData,
          // Дополнительные поля, которые могут содержать текст (для групповых чатов)
          message: notificationBody.messageData?.message || notificationBody.message,
          messageText: notificationBody.messageData?.messageText || notificationBody.messageText,
          content: notificationBody.messageData?.content || notificationBody.content,
          body: notificationBody.messageData?.body || notificationBody.body,
        },
      };

      // Логируем важные поля для отладки групповых чатов
      if (webhookData.data?.chatId?.includes('@g.us') || webhookData.data?.senderData?.chatId?.includes('@g.us')) {
        this.logger.log(`🔍 GROUP CHAT NOTIFICATION DETECTED:`);
        this.logger.log(`  - typeWebhook: ${webhookData.typeWebhook}`);
        this.logger.log(`  - chatId from senderData: ${notificationBody.senderData?.chatId}`);
        this.logger.log(`  - chatId from messageData: ${notificationBody.messageData?.chatId}`);
        this.logger.log(`  - chatId in data: ${webhookData.data.chatId}`);
        this.logger.log(`  - sender: ${webhookData.data.sender}`);
        this.logger.log(`  - chatName: ${webhookData.data.chatName || notificationBody.senderData?.chatName}`);
        this.logger.log(`  - typeMessage: ${webhookData.data.typeMessage}`);
        this.logger.log(`  - textMessage in messageData: ${notificationBody.messageData?.textMessage}`);
        this.logger.log(`  - textMessage in data: ${webhookData.data.textMessage}`);
        this.logger.log(`  - Full messageData: ${JSON.stringify(notificationBody.messageData, null, 2)}`);
        this.logger.log(`  - Full senderData: ${JSON.stringify(notificationBody.senderData, null, 2)}`);
      }
      
      // Логируем для ВСЕХ сообщений структуру данных для отладки
      this.logger.log(`📦 NOTIFICATION STRUCTURE:`);
      this.logger.log(`  - typeWebhook: ${notificationBody.typeWebhook}`);
      this.logger.log(`  - messageData.typeMessage: ${notificationBody.messageData?.typeMessage}`);
      this.logger.log(`  - messageData.textMessageData?.textMessage: ${notificationBody.messageData?.textMessageData?.textMessage || 'N/A'}`);
      this.logger.log(`  - messageData.textMessage: ${notificationBody.messageData?.textMessage || 'N/A'}`);
      this.logger.log(`  - messageData.text: ${notificationBody.messageData?.text || 'N/A'}`);
      this.logger.log(`  - messageData keys: ${notificationBody.messageData ? Object.keys(notificationBody.messageData).join(', ') : 'N/A'}`);
      this.logger.log(`  - Final data.typeMessage: ${webhookData.data.typeMessage}`);
      this.logger.log(`  - Final data.textMessageData?.textMessage: ${webhookData.data.textMessageData?.textMessage || 'N/A'}`);
      this.logger.log(`  - Final data.textMessage: ${webhookData.data.textMessage || 'N/A'}`);
      this.logger.log(`  - Final data.text: ${webhookData.data.text || 'N/A'}`);
      this.logger.log(`  - Final data.message: ${(webhookData.data as any).message || 'N/A'}`);
      this.logger.log(`  - Final data.keys: ${Object.keys(webhookData.data).join(', ')}`);
      
      // ВАЖНО: Для текстовых сообщений логируем ПОЛНУЮ структуру notificationBody
      // чтобы увидеть, где именно находится текст
      if (notificationBody.messageData?.typeMessage === 'textMessage' || 
          notificationBody.messageData?.typeMessage === 'extendedTextMessage' ||
          !notificationBody.messageData?.typeMessage) {
        this.logger.warn(`  - 📝 TEXT MESSAGE DETECTED - Full notificationBody structure:`);
        this.logger.warn(`  ${JSON.stringify(notificationBody, null, 2)}`);
      }
      
      // Если текст не найден в основных полях, логируем полную структуру notificationBody
      if (!notificationBody.messageData?.textMessageData?.textMessage && 
          !notificationBody.messageData?.textMessage && 
          !notificationBody.messageData?.text && 
          !notificationBody.textMessage && 
          !notificationBody.text) {
        this.logger.warn(`  - ⚠️ No text in notificationBody! Full structure (first 5000 chars): ${JSON.stringify(notificationBody, null, 2).substring(0, 5000)}`);
      }
      
      this.logger.debug(`✅ Converted to webhook format: ${JSON.stringify(webhookData, null, 2)}`);

      // Используем существующую логику обработки
      await this.handleWebhook(webhookData);
    } catch (error) {
      this.logger.error('❌ Error processing notification:', error);
      throw error;
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
          case 'outgoingMessageReceived':
            // Сообщения, отправленные с телефона (не через API) - обрабатываем как входящие
            // ВАЖНО: Для outgoingMessageReceived структура данных может отличаться
            // chatId может быть в senderData.chatId, а текст в messageData.textMessageData.textMessage
            this.logger.log(`📤 Processing outgoing message (sent from phone): ${webhook.idMessage}`);
            this.logger.log(`📤 Full webhook data: ${JSON.stringify(webhook, null, 2)}`);
            // Обрабатываем как входящее сообщение (для нас это входящее, так как отправлено с телефона)
            await this.processIncomingMessage(webhook);
            break;
          case 'outgoingMessageStatus':
            await this.processStatusUpdate(webhook);
            break;
          case 'stateInstanceChanged':
            this.logger.log(`Instance state changed: ${JSON.stringify(webhook.data)}`);
            break;
          case 'quotaExceeded':
            // Обрабатываем quotaExceeded - это информационное уведомление, не ошибка
            const quotaData = (webhook as any).quotaData;
            if (quotaData) {
              this.logger.warn(`⚠️ Quota exceeded: ${quotaData.description || 'Monthly quota has been exceeded'}`);
              this.logger.warn(`📊 Used: ${quotaData.used}/${quotaData.total} (${quotaData.method})`);
              if (quotaData.description) {
                const allowedContacts = quotaData.description.split('numbers: ')[1]?.split('.')[0] || 'N/A';
                this.logger.warn(`ℹ️ Allowed contacts: ${allowedContacts}`);
              }
            }
            break; // Не обрабатываем как сообщение
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

      // Согласно документации Green API:
      // - senderData.chatId - ID чата (может быть номер инстанса для личных чатов или ID группы)
      // - senderData.sender - номер отправителя (для личных чатов это номер собеседника, для групп - номер участника)
      // - Для личных чатов chatId может быть номером инстанса, а реальный номер в sender
      
      // Получаем chatId и sender из senderData (приоритет) или из data
      // ВАЖНО: В processNotification мы уже распаковали senderData в data,
      // но senderData также может быть вложенным объектом
      const senderData = data.senderData || {};
      let chatId = senderData.chatId || data.chatId || senderData.senderId || data.senderId || data.sender || data.from;
      const sender = senderData.sender || data.sender || senderData.senderId || data.senderId;
      
      // Детальное логирование для отладки
      this.logger.log(`🔍 EXTRACTING DATA FROM WEBHOOK:`);
      this.logger.log(`  - data.chatId: ${data.chatId}`);
      this.logger.log(`  - data.sender: ${data.sender}`);
      this.logger.log(`  - data.typeMessage: ${data.typeMessage}`);
      this.logger.log(`  - data.textMessage: ${data.textMessage}`);
      this.logger.log(`  - senderData.chatId: ${senderData.chatId}`);
      this.logger.log(`  - senderData.sender: ${senderData.sender}`);
      this.logger.log(`  - Final chatId: ${chatId}`);
      this.logger.log(`  - Final sender: ${sender}`);
      this.logger.log(`  - All data keys: ${Object.keys(data).join(', ')}`);
      
      if (!chatId) {
        this.logger.warn('ChatId is missing in webhook data');
        this.logger.warn(`Available data fields: ${Object.keys(data).join(', ')}`);
        this.logger.warn(`SenderData: ${JSON.stringify(senderData, null, 2)}`);
        this.logger.warn(`Full data: ${JSON.stringify(data, null, 2)}`);
        return;
      }
      
      this.logger.log(`Processing message - chatId: ${chatId}, sender: ${sender || 'N/A'}`);
      this.logger.debug(`Full senderData: ${JSON.stringify(senderData, null, 2)}`);
      this.logger.debug(`Full data object keys: ${Object.keys(data).join(', ')}`);

      // Извлекаем номер телефона отправителя
      // ВАЖНО: Для личных чатов chatId может быть номером инстанса (77471400312@c.us),
      // а реальный номер отправителя находится в sender (77076375247@c.us)
      let phoneNumber = '';
      let isGroupChat = false;
      let groupName = '';
      let groupChatId = ''; // Сохраняем chatId группы для отправки сообщений
      
      if (chatId.includes('@g.us')) {
        // Групповой чат
        isGroupChat = true;
        groupChatId = chatId;
        // Извлекаем название группы из разных источников
        groupName = senderData.chatName || 
                   data.chatName || 
                   senderData.groupName ||
                   data.groupName ||
                   `Группа ${chatId.split('@')[0]}`;
        
        this.logger.log(`🔍 Group chat name extraction:`);
        this.logger.log(`  - senderData.chatName: ${senderData.chatName}`);
        this.logger.log(`  - data.chatName: ${data.chatName}`);
        this.logger.log(`  - Final groupName: ${groupName}`);
        
        // Берем sender из senderData для создания клиента отправителя
        if (sender) {
          phoneNumber = sender.split('@')[0];
        } else if (senderData.senderId) {
          phoneNumber = senderData.senderId.split('@')[0];
        } else {
          // Если не можем определить отправителя в группе, используем chatId группы как идентификатор
          this.logger.warn(`Group chat detected but no sender found: ${chatId}`);
          phoneNumber = `group_${chatId.split('@')[0]}`;
        }
        
        this.logger.log(`Group chat detected: ${groupName}, sender: ${phoneNumber}, groupChatId: ${groupChatId}`);
      } else if (chatId.includes('@c.us')) {
        // Личный чат
        // ВАЖНО: chatId может быть номером инстанса (77471400312@c.us),
        // а реальный номер отправителя в sender (77076375247@c.us)
        if (sender && sender.includes('@c.us')) {
          // Используем sender как номер отправителя
          phoneNumber = sender.split('@')[0];
          this.logger.log(`Personal chat - using sender as phoneNumber: ${phoneNumber} (chatId was: ${chatId})`);
        } else {
          // Если sender нет, используем chatId, но проверяем, не является ли он номером инстанса
          const chatIdNumber = chatId.split('@')[0];
          const instanceNumber = this.phoneNumber.replace(/[+\s()\-]/g, '');
          
          if (chatIdNumber === instanceNumber) {
            // chatId совпадает с номером инстанса - это ошибка, не должно быть
            this.logger.error(`ERROR: chatId (${chatId}) matches instance number (${instanceNumber}). This should not happen for incoming messages!`);
            this.logger.error(`Sender data: ${JSON.stringify(senderData, null, 2)}`);
            // Пытаемся найти реальный номер в других местах
            phoneNumber = senderData.senderId?.split('@')[0] || chatIdNumber;
          } else {
            phoneNumber = chatIdNumber;
          }
        }
      } else {
        // Неизвестный формат
        phoneNumber = chatId.split('@')[0];
        this.logger.warn(`Unknown chatId format: ${chatId}, extracted phoneNumber: ${phoneNumber}`);
      }
      
      this.logger.log(`Extracted phone number: ${phoneNumber}, isGroup: ${isGroupChat}, groupChatId: ${groupChatId || 'N/A'}`);
      
      const messageId = data.idMessage || webhookData.idMessage;
      const timestamp = data.timestamp || webhookData.timestamp || Date.now();

      // Извлекаем текст сообщения в зависимости от типа
      // Согласно документации Green API, нужно проверять все возможные места
      let content = '';
      
      // Логируем структуру данных для отладки (ВСЕГДА для всех сообщений, чтобы найти проблему)
      this.logger.log(`🔍 EXTRACTING MESSAGE CONTENT:`);
      this.logger.log(`  - typeMessage: ${data.typeMessage || 'MISSING'}`);
      this.logger.log(`  - isGroupChat: ${isGroupChat}`);
      this.logger.log(`  - messageId: ${messageId}`);
      this.logger.log(`  - Available data keys: ${Object.keys(data).join(', ')}`);
      this.logger.log(`  - data.textMessageData?.textMessage: ${data.textMessageData?.textMessage || 'N/A'}`);
      this.logger.log(`  - data.textMessage: ${data.textMessage || 'N/A'}`);
      this.logger.log(`  - data.text: ${data.text || 'N/A'}`);
      this.logger.log(`  - data.message: ${(data as any).message || 'N/A'}`);
      this.logger.log(`  - data.messageText: ${(data as any).messageText || 'N/A'}`);
      this.logger.log(`  - data.content: ${(data as any).content || 'N/A'}`);
      this.logger.log(`  - data.body: ${(data as any).body || 'N/A'}`);
      this.logger.log(`  - data.messageData?.textMessageData?.textMessage: ${data.messageData?.textMessageData?.textMessage || 'N/A'}`);
      this.logger.log(`  - data.messageData?.textMessage: ${data.messageData?.textMessage || 'N/A'}`);
      this.logger.log(`  - data.messageData?.text: ${data.messageData?.text || 'N/A'}`);
      this.logger.log(`  - data.messageData?.message: ${data.messageData?.message || 'N/A'}`);
      this.logger.log(`  - data.extendedTextMessageData?.text: ${data.extendedTextMessageData?.text || 'N/A'}`);
      // Логируем полную структуру только если текст не найден (чтобы не засорять логи)
      if (!data.textMessageData?.textMessage && 
          !data.textMessage && 
          !data.text && 
          !data.messageData?.textMessageData?.textMessage &&
          !data.messageData?.textMessage && 
          !data.messageData?.text) {
        this.logger.warn(`  - ⚠️ No text found in common fields! Full data structure (first 3000 chars): ${JSON.stringify(data, null, 2).substring(0, 3000)}`);
      }
      
      // Сначала проверяем общие поля, которые могут быть в любом типе сообщения
      // ВАЖНО: Для групповых чатов текст может быть в messageData напрямую
      // ВАЖНО: Согласно документации Green API, текст может быть в textMessageData.textMessage
      // Проверяем ВСЕ возможные поля в порядке приоритета
      if (data.textMessageData?.textMessage) {
        // ПРИОРИТЕТ: textMessageData.textMessage (официальная структура Green API)
        content = data.textMessageData.textMessage;
        if (isGroupChat) {
          this.logger.log(`  ✅ Found textMessageData.textMessage: "${content.substring(0, 100)}"`);
        } else {
          this.logger.debug(`Found textMessageData.textMessage: "${content.substring(0, 50)}"`);
        }
      } else if (data.textMessage) {
        content = data.textMessage;
        if (isGroupChat) {
          this.logger.log(`  ✅ Found textMessage: "${content.substring(0, 100)}"`);
        } else {
          this.logger.debug(`Found textMessage: "${content.substring(0, 50)}"`);
        }
      } else if (data.text) {
        content = data.text;
        if (isGroupChat) {
          this.logger.log(`  ✅ Found text: "${content.substring(0, 100)}"`);
        } else {
          this.logger.debug(`Found text: "${content.substring(0, 50)}"`);
        }
      } else if ((data as any).message) {
        content = (data as any).message;
        if (isGroupChat) {
          this.logger.log(`  ✅ Found message: "${content.substring(0, 100)}"`);
        } else {
          this.logger.debug(`Found message: "${content.substring(0, 50)}"`);
        }
      } else if ((data as any).messageText) {
        content = (data as any).messageText;
        if (isGroupChat) {
          this.logger.log(`  ✅ Found messageText: "${content.substring(0, 100)}"`);
        } else {
          this.logger.debug(`Found messageText: "${content.substring(0, 50)}"`);
        }
      } else if ((data as any).content) {
        content = (data as any).content;
        if (isGroupChat) {
          this.logger.log(`  ✅ Found content: "${content.substring(0, 100)}"`);
        } else {
          this.logger.debug(`Found content: "${content.substring(0, 50)}"`);
        }
      } else if ((data as any).body) {
        content = (data as any).body;
        if (isGroupChat) {
          this.logger.log(`  ✅ Found body: "${content.substring(0, 100)}"`);
        } else {
          this.logger.debug(`Found body: "${content.substring(0, 50)}"`);
        }
      } else if (data.messageData?.textMessageData?.textMessage) {
        // ВАЖНО: Согласно документации Green API, текст может быть в messageData.textMessageData.textMessage
        content = data.messageData.textMessageData.textMessage;
        if (isGroupChat) {
          this.logger.log(`  ✅ Found textMessageData.textMessage in messageData: "${content.substring(0, 100)}"`);
        } else {
          this.logger.debug(`Found textMessageData.textMessage in messageData: "${content.substring(0, 50)}"`);
        }
      } else if (data.messageData?.textMessage) {
        // Для групповых чатов текст может быть в messageData
        content = data.messageData.textMessage;
        if (isGroupChat) {
          this.logger.log(`  ✅ Found textMessage in messageData: "${content.substring(0, 100)}"`);
        }
      } else if (data.messageData?.text) {
        content = data.messageData.text;
        if (isGroupChat) {
          this.logger.log(`  ✅ Found text in messageData: "${content.substring(0, 100)}"`);
        }
      } else if (data.messageData?.message) {
        content = data.messageData.message;
        if (isGroupChat) {
          this.logger.log(`  ✅ Found message in messageData: "${content.substring(0, 100)}"`);
        }
      } else if (data.messageData?.messageText) {
        content = data.messageData.messageText;
        if (isGroupChat) {
          this.logger.log(`  ✅ Found messageText in messageData: "${content.substring(0, 100)}"`);
        }
      } else if (data.messageData?.content) {
        content = data.messageData.content;
        if (isGroupChat) {
          this.logger.log(`  ✅ Found content in messageData: "${content.substring(0, 100)}"`);
        }
      } else if (data.messageData?.body) {
        content = data.messageData.body;
        if (isGroupChat) {
          this.logger.log(`  ✅ Found body in messageData: "${content.substring(0, 100)}"`);
        }
      }
      
      // Затем обрабатываем специфичные типы
      // ВАЖНО: Не перезаписываем content, если он уже был установлен выше
      // ВАЖНО: Если typeMessage отсутствует или пустой, но есть textMessage/text, это тоже текстовое сообщение
      if (!content && (data.typeMessage === 'textMessage' || !data.typeMessage || data.typeMessage === '')) {
        // Простое текстовое сообщение
        // Для групповых чатов текст может быть в messageData напрямую
        // Проверяем ВСЕ возможные места для текста (включая textMessageData.textMessage)
        content = data.textMessageData?.textMessage ||
                 data.textMessage || 
                 data.text || 
                 data.message ||
                 data.messageText ||
                 data.content ||
                 data.body ||
                 data.messageData?.textMessageData?.textMessage ||
                 data.messageData?.textMessage ||
                 data.messageData?.text ||
                 data.messageData?.message ||
                 data.messageData?.messageText ||
                 data.messageData?.content ||
                 data.messageData?.body ||
                 (data as any).message ||
                 (data as any).messageText ||
                 (data as any).content ||
                 (data as any).body ||
                 '';
        if (content) {
          this.logger.log(`  ✅ Found content for textMessage (or no type): "${content.substring(0, 100)}"`);
        }
      } else if (data.typeMessage === 'extendedTextMessage') {
        // Расширенное текстовое сообщение
        if (!content && data.extendedTextMessageData) {
          content = data.extendedTextMessageData.text || 
                   data.extendedTextMessageData.description || 
                   '';
          if (content) {
            this.logger.log(`  ✅ Found content in extendedTextMessageData: "${content.substring(0, 100)}"`);
          }
        }
        if (!content) {
          // Расширенный поиск для extendedTextMessage
          content = data.textMessage || 
                   data.text || 
                   data.message ||
                   data.messageText ||
                   data.content ||
                   data.body ||
                   data.messageData?.textMessage ||
                   data.messageData?.text ||
                   data.messageData?.message ||
                   data.messageData?.messageText ||
                   data.messageData?.content ||
                   data.messageData?.body ||
                   (data as any).message ||
                   (data as any).messageText ||
                   (data as any).content ||
                   (data as any).body ||
                   '';
          if (content) {
            this.logger.log(`  ✅ Found content as fallback for extendedTextMessage: "${content.substring(0, 100)}"`);
          }
        }
        if (!content && data.messageData?.extendedTextMessageData) {
          content = data.messageData.extendedTextMessageData.text || 
                   data.messageData.extendedTextMessageData.description || '';
          if (content) {
            this.logger.log(`  ✅ Found content in messageData.extendedTextMessageData: "${content.substring(0, 100)}"`);
          }
        }
        // Дополнительная проверка для групповых чатов - текст может быть в messageData напрямую
        if (!content && data.messageData) {
          content = data.messageData.textMessage || 
                   data.messageData.text ||
                   data.messageData.message ||
                   data.messageData.messageText ||
                   data.messageData.content ||
                   data.messageData.body ||
                   data.messageData.extendedTextMessageData?.text ||
                   data.messageData.extendedTextMessageData?.description ||
                   '';
          if (content) {
            this.logger.log(`  ✅ Found content in messageData (group chat): "${content.substring(0, 100)}"`);
          }
        }
      } else if (data.typeMessage === 'quotedMessage') {
        // Сообщение с цитатой - текст может быть в разных местах
        // Согласно Green API, quotedMessage может содержать текст в:
        // - textMessage (текст самого сообщения) - ПРИОРИТЕТ
        // - extendedTextMessageData.text (если это расширенное сообщение)
        // - quotedMessageData.textMessage (текст цитируемого сообщения) - только если нет текста самого сообщения
        
        // Сначала проверяем текст самого сообщения (не цитаты)
        if (data.textMessage || data.text) {
          content = data.textMessage || data.text;
        } else if (data.extendedTextMessageData?.text) {
          content = data.extendedTextMessageData.text;
        } else if (data.extendedTextMessageData?.description) {
          content = data.extendedTextMessageData.description;
        }
        
        // Если нет текста самого сообщения, берем из цитаты
        if (!content && data.quotedMessageData) {
          // Текст из цитируемого сообщения
          content = data.quotedMessageData.textMessage || 
                   data.quotedMessageData.text ||
                   data.quotedMessageData.extendedTextMessageData?.text ||
                   data.quotedMessageData.extendedTextMessageData?.description ||
                   '';
        }
        
        // Если все еще нет текста, логируем для отладки
        if (!content) {
          this.logger.warn(`quotedMessage without text - quotedMessageData keys: ${data.quotedMessageData ? Object.keys(data.quotedMessageData).join(', ') : 'N/A'}`);
          content = '[Сообщение с цитатой]';
        }
      } else if (data.typeMessage === 'reactionMessage') {
        // Реакция на сообщение
        if (data.reactionMessageData) {
          const reactionText = data.reactionMessageData.reactionText || 
                              data.reactionMessageData.text || 
                              '';
          const messageText = data.textMessage || data.text || '';
          content = reactionText ? `${reactionText} ${messageText}`.trim() : messageText;
        } else {
          content = data.textMessage || data.text || '[Реакция]';
        }
      } else if (data.typeMessage === 'imageMessage') {
        content = data.caption || 
                 data.imageMessageData?.caption || 
                 data.fileMessageData?.caption || 
                 '[Изображение]';
      } else if (data.typeMessage === 'videoMessage') {
        content = data.caption || 
                 data.videoMessageData?.caption || 
                 data.fileMessageData?.caption || 
                 '[Видео]';
      } else if (data.typeMessage === 'audioMessage') {
        // Для аудио сообщений проверяем разные места
        content = data.caption || 
                 data.audioMessageData?.caption || 
                 data.fileMessageData?.caption ||
                 data.textMessage ||
                 data.text ||
                 '[Аудио сообщение]';
      } else if (data.typeMessage === 'documentMessage') {
        const fileName = data.fileName || 
                        data.documentMessageData?.fileName || 
                        data.fileMessageData?.fileName || 
                        'файл';
        content = data.caption || 
                 data.documentMessageData?.caption || 
                 data.fileMessageData?.caption || 
                 `[Документ: ${fileName}]`;
      } else if (data.typeMessage === 'voiceMessage') {
        content = data.caption || data.textMessage || data.text || '[Голосовое сообщение]';
      } else if (data.typeMessage === 'stickerMessage') {
        content = data.caption || '[Стикер]';
      } else if (data.typeMessage === 'locationMessage') {
        const lat = data.locationMessageData?.latitude || data.latitude;
        const lon = data.locationMessageData?.longitude || data.longitude;
        content = data.caption || (lat && lon ? `[Геолокация: ${lat}, ${lon}]` : '[Геолокация]');
      } else if (data.typeMessage === 'contactMessage') {
        const contactName = data.contactMessageData?.displayName || 
                           data.contactName || 
                           '';
        content = data.caption || (contactName ? `[Контакт: ${contactName}]` : '[Контакт]');
      } else {
        // Для неизвестных типов пытаемся найти текст в разных местах
        // ВАЖНО: Для групповых чатов текст может быть в messageData напрямую
        content = data.textMessage || 
                 data.text || 
                 data.caption ||
                 data.messageData?.textMessage ||
                 data.messageData?.text ||
                 data.extendedTextMessageData?.text ||
                 data.extendedTextMessageData?.description ||
                 data.quotedMessageData?.textMessage ||
                 data.quotedMessageData?.text ||
                 data.messageData?.extendedTextMessageData?.text ||
                 data.messageData?.extendedTextMessageData?.description ||
                 '';
        
        if (!content) {
          if (isGroupChat) {
            this.logger.warn(`⚠️ Unknown message type for group chat: ${data.typeMessage}`);
            this.logger.warn(`  - Available keys: ${Object.keys(data).join(', ')}`);
            this.logger.warn(`  - messageData keys: ${data.messageData ? Object.keys(data.messageData).join(', ') : 'N/A'}`);
            this.logger.warn(`  - Full data structure: ${JSON.stringify(data, null, 2)}`);
          } else {
            this.logger.warn(`Unknown message type: ${data.typeMessage}, available keys: ${Object.keys(data).join(', ')}`);
          }
          content = `[${data.typeMessage || 'Неподдерживаемый тип сообщения'}]`;
        }
      }
      
      // Финальная проверка - если content пустой, используем fallback
      // АГРЕССИВНЫЙ ПОИСК для ВСЕХ сообщений (не только групповых) - проверяем ВСЕ возможные места
      if (!content || content.trim() === '') {
        this.logger.warn(`⚠️ EMPTY CONTENT for message! Trying aggressive extraction...`);
        this.logger.warn(`  - typeMessage: ${data.typeMessage}`);
        this.logger.warn(`  - messageId: ${messageId}`);
        this.logger.warn(`  - isGroupChat: ${isGroupChat}`);
        this.logger.warn(`  - Full data keys: ${Object.keys(data).join(', ')}`);
        
        // АГРЕССИВНЫЙ ПОИСК - проверяем ВСЕ возможные места для ВСЕХ типов сообщений
        const possibleTextFields = [
          // ПРИОРИТЕТ: textMessageData.textMessage (официальная структура Green API)
          data.textMessageData?.textMessage,
          data.messageData?.textMessageData?.textMessage,
          // Прямые поля
          data.textMessage,
          data.text,
          data.caption,
          data.message,
          data.messageText,
          data.content,
          data.body,
          // В messageData
          data.messageData?.textMessage,
          data.messageData?.text,
          data.messageData?.caption,
          data.messageData?.message,
          data.messageData?.messageText,
          data.messageData?.content,
          data.messageData?.body,
          // Вложенные структуры
          data.extendedTextMessageData?.text,
          data.extendedTextMessageData?.description,
          data.messageData?.extendedTextMessageData?.text,
          data.messageData?.extendedTextMessageData?.description,
          data.quotedMessageData?.textMessage,
          data.quotedMessageData?.text,
          data.fileMessageData?.caption,
          data.imageMessageData?.caption,
          data.videoMessageData?.caption,
          data.audioMessageData?.caption,
          data.documentMessageData?.caption,
          // Дополнительные поля из processNotification
          (data as any).message,
          (data as any).messageText,
          (data as any).content,
          (data as any).body,
        ];
        
        for (const field of possibleTextFields) {
          if (field && typeof field === 'string' && field.trim()) {
            content = field.trim();
            this.logger.log(`  ✅ Found text in aggressive search: "${content.substring(0, 100)}"`);
            break;
          }
        }
        
        // Если все еще нет текста, логируем полную структуру
        if (!content || content.trim() === '') {
          this.logger.warn(`  - Full data structure: ${JSON.stringify(data, null, 2)}`);
          // Для отладки: проверяем, есть ли вообще какие-то строковые поля
          const allStringFields: string[] = [];
          const checkObject = (obj: any, prefix = '') => {
            if (obj && typeof obj === 'object') {
              for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'string' && value.trim() && value.length > 0) {
                  allStringFields.push(`${prefix}${key}: "${value.substring(0, 50)}"`);
                } else if (value && typeof value === 'object') {
                  checkObject(value, `${prefix}${key}.`);
                }
              }
            }
          };
          checkObject(data);
          if (allStringFields.length > 0) {
            this.logger.warn(`  - Found string fields in data: ${allStringFields.join(', ')}`);
          }
          content = '[Сообщение без текста]';
        }
      }
      
      if (isGroupChat) {
        this.logger.log(`  ✅ Final extracted content: "${content.substring(0, 200)}${content.length > 200 ? '...' : ''}"`);
      } else {
        this.logger.debug(`Extracted content for ${data.typeMessage}: "${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`);
      }

      if (!content && !messageId) {
        this.logger.warn('Message content and ID are both empty');
        return;
      }

      // Находим или создаем клиента
      let client: Client;
      
      if (isGroupChat && groupChatId) {
        // Для групповых чатов ищем клиента по whatsappId (groupChatId) или по notes
        // ВСЕ сообщения из группы должны быть связаны с ОДНИМ клиентом группы
        client = await this.clientsRepository.findOne({
          where: { whatsappId: groupChatId },
        });
        
        if (!client) {
          // Если не нашли по whatsappId, ищем по notes
          const allClients = await this.clientsRepository.find();
          client = allClients.find((c) => 
            c.notes && c.notes.includes(`Group: ${groupChatId}`)
          ) || null;
        }
        
        if (!client) {
          // Создаем нового клиента для группы
          // ВАЖНО: для групп используем groupChatId как whatsappId
          client = this.clientsRepository.create({
            name: groupName,
            phone: null, // Для групп не используем phone
            whatsappId: groupChatId, // Сохраняем полный groupChatId в whatsappId
            notes: `Group: ${groupChatId}\nGroup Name: ${groupName}`,
          });
          await this.clientsRepository.save(client);
          this.logger.log(`✅ Created new client for group: ${groupName} (${groupChatId}), clientId: ${client.id}`);
        } else {
          // Обновляем whatsappId и имя группы если нужно
          if (client.whatsappId !== groupChatId) {
            client.whatsappId = groupChatId;
            this.logger.log(`Updated client whatsappId to groupChatId: ${groupChatId}`);
          }
          if (client.name !== groupName && groupName && !groupName.startsWith('Группа ')) {
            client.name = groupName;
            this.logger.log(`Updated client name to: ${groupName}`);
          }
          if (client.notes && !client.notes.includes(`Group: ${groupChatId}`)) {
            client.notes = client.notes ? `${client.notes}\nGroup: ${groupChatId}\nGroup Name: ${groupName}` : `Group: ${groupChatId}\nGroup Name: ${groupName}`;
          }
          await this.clientsRepository.save(client);
          this.logger.log(`✅ Found existing client for group: ${groupName} (${groupChatId}), clientId: ${client.id}`);
        }
      } else {
        // Для личных чатов используем имя отправителя
        // ВАЖНО: Для outgoingMessageReceived (сообщения, отправленные с телефона)
        // нужно искать клиента более агрессивно, так как chatId может отличаться
        const clientName = data.senderName || undefined;
        
        // Сначала пытаемся найти клиента по нормализованному номеру
        // Это важно для outgoingMessageReceived, когда chatId может быть в другом формате
        client = await this.findOrCreateClient(phoneNumber, clientName, chatId);
      }

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
      
      // Дополнительная проверка на дублирование по clientId, content и времени (в пределах 5 секунд)
      const timestampDate = new Date(timestamp * 1000);
      const fiveSecondsAgo = new Date(timestampDate.getTime() - 5000);
      const fiveSecondsLater = new Date(timestampDate.getTime() + 5000);
      
      const duplicateCheck = await this.messagesRepository.findOne({
        where: {
          clientId: client.id,
          content: content || '[Сообщение без текста]',
          createdAt: Between(fiveSecondsAgo, fiveSecondsLater),
        },
      });
      
      if (duplicateCheck) {
        this.logger.warn(`Duplicate message detected (same content and time), skipping`);
        return;
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
        ticketId: ticket?.id || null,
        isRead: false,
        isDelivered: true,
        deliveredAt: new Date(timestamp * 1000),
      });

      await this.messagesRepository.save(savedMessage);

      if (isGroupChat) {
        this.logger.log(`✅ GROUP CHAT MESSAGE SAVED:`);
        this.logger.log(`  - messageId: ${messageId}`);
        this.logger.log(`  - groupChatId: ${groupChatId}`);
        this.logger.log(`  - groupName: ${groupName}`);
        this.logger.log(`  - sender: ${phoneNumber}`);
        this.logger.log(`  - clientId: ${savedMessage.clientId}`);
        this.logger.log(`  - content: "${savedMessage.content.substring(0, 100)}${savedMessage.content.length > 100 ? '...' : ''}"`);
        this.logger.log(`  - direction: ${savedMessage.direction}`);
        this.logger.log(`  - savedMessageId: ${savedMessage.id}`);
      } else {
        this.logger.log(
          `✅ Incoming message processed: ${messageId} from ${phoneNumber} (${data.senderName || 'Unknown'})`,
        );
        this.logger.log(
          `📝 Message saved: ID=${savedMessage.id}, clientId=${savedMessage.clientId}, ticketId=${savedMessage.ticketId}, channel=${savedMessage.channel}, direction=${savedMessage.direction}`,
        );
      }
      
      // Проверяем, что direction правильно установлен
      if (savedMessage.direction !== MessageDirection.INBOUND) {
        this.logger.error(`❌ ERROR: Incoming message has wrong direction! Expected INBOUND, got ${savedMessage.direction}`);
      }
      
      // Проверяем, что сообщение действительно сохранено
      const verifyMessage = await this.messagesRepository.findOne({
        where: { id: savedMessage.id },
        relations: ['client'],
      });
      
      if (verifyMessage) {
        this.logger.log(`✅ Message verified in DB: clientId=${verifyMessage.clientId}, clientName=${verifyMessage.client?.name}`);
      } else {
        this.logger.error(`❌ Message NOT found in DB after save!`);
      }

      // Автоматический вызов AI для входящих сообщений (только для личных чатов)
      // Выполняем асинхронно, чтобы не блокировать обработку сообщения
      if (!isGroupChat && content && content.trim() && client) {
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
                
                // Проверка дня недели
                if (workingHours.weekdays && workingHours.weekdays.length > 0 && !workingHours.weekdays.includes(currentDay)) {
                  this.logger.log(`⏰ AI пропущен: выходной день для клиента ${client.id}`);
                  return;
                }
                
                // Проверка времени
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
                  phoneNumber: phoneNumber,
                  message: aiResponse.response,
                  ticketId: ticket?.id || null,
                }, null); // null user = системный вызов
                
                this.logger.log(`✅ AI ответ отправлен клиенту ${phoneNumber}`);
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
    chatId?: string,
  ): Promise<Client> {
    // Нормализуем номер телефона (убираем +, пробелы, скобки, дефисы)
    let normalizedPhone = phoneNumber.replace(/[+\s()\-]/g, '');
    
    // Убираем ведущие нули и код страны если он дублируется
    // Например: 877055837474 -> 77055837474
    if (normalizedPhone.startsWith('8') && normalizedPhone.length > 11) {
      normalizedPhone = '7' + normalizedPhone.substring(1);
    }
    
    // Если номер начинается не с 7, добавляем 7 (для Казахстана и России)
    if (!normalizedPhone.startsWith('7') && normalizedPhone.length >= 10) {
      normalizedPhone = '7' + normalizedPhone;
    }
    
    // Берем последние 11 цифр для нормализации
    if (normalizedPhone.length > 11) {
      normalizedPhone = normalizedPhone.substring(normalizedPhone.length - 11);
    }
    
    this.logger.log(`Finding or creating client for phone: ${normalizedPhone} (original: ${phoneNumber})${chatId ? `, chatId: ${chatId}` : ''}`);

    // Ищем клиента по номеру телефона или WhatsApp ID
    // ВАЖНО: Для outgoingMessageReceived нужно искать более агрессивно
    let client: Client | null = null;
    
    // Если передан chatId, сначала ищем по нему (для точного совпадения)
    if (chatId && chatId.includes('@c.us')) {
      const chatIdNumber = chatId.split('@')[0];
      // Нормализуем номер из chatId
      let normalizedChatIdNumber = chatIdNumber.replace(/[+\s()\-]/g, '');
      if (normalizedChatIdNumber.startsWith('8') && normalizedChatIdNumber.length > 11) {
        normalizedChatIdNumber = '7' + normalizedChatIdNumber.substring(1);
      }
      if (!normalizedChatIdNumber.startsWith('7') && normalizedChatIdNumber.length >= 10) {
        normalizedChatIdNumber = '7' + normalizedChatIdNumber;
      }
      if (normalizedChatIdNumber.length > 11) {
        normalizedChatIdNumber = normalizedChatIdNumber.substring(normalizedChatIdNumber.length - 11);
      }
      
      // Ищем по полному chatId (включая @c.us)
      client = await this.clientsRepository.findOne({
        where: { whatsappId: chatId },
      });
      
      // Если не нашли, ищем по нормализованному номеру из chatId
      if (!client && normalizedChatIdNumber === normalizedPhone) {
        client = await this.clientsRepository.findOne({
          where: [
            { phone: normalizedChatIdNumber },
            { whatsappId: normalizedChatIdNumber },
          ],
        });
      }
    }
    
    // Если не нашли по chatId, ищем по нормализованному номеру телефона
    if (!client) {
      client = await this.clientsRepository.findOne({
        where: [
          { phone: normalizedPhone },
          { whatsappId: normalizedPhone },
        ],
      });
    }

    // Если не нашли точное совпадение, ищем по частичному совпадению whatsappId
    // (например, если в БД '3223', а приходит '79991234567', ищем клиентов с whatsappId, который содержится в номере)
    if (!client) {
      this.logger.log(`No exact match found, searching for partial match...`);
      
      // Получаем всех клиентов с whatsappId
      const allClients = await this.clientsRepository.find({
        where: { whatsappId: Not(IsNull()) },
      });
      
      // Ищем клиента, у которого whatsappId содержится в normalizedPhone или наоборот
      // Также проверяем последние цифры номера (для случаев типа 3223 в 77471400312)
      client = allClients.find((c) => {
        if (!c.whatsappId) return false;
        const clientWhatsappId = c.whatsappId.replace(/[+\s]/g, '');
        
        // Прямое совпадение
        if (normalizedPhone === clientWhatsappId || clientWhatsappId === normalizedPhone) {
          return true;
        }
        
        // Проверяем, содержится ли whatsappId клиента в номере или номер в whatsappId
        if (normalizedPhone.includes(clientWhatsappId) || clientWhatsappId.includes(normalizedPhone)) {
          return true;
        }
        
        // Проверяем последние цифры (для случаев типа 3223 в конце 77471400312)
        if (normalizedPhone.endsWith(clientWhatsappId) || clientWhatsappId.endsWith(normalizedPhone)) {
          return true;
        }
        
        return false;
      }) || null;
      
      if (client) {
        this.logger.log(`Found client by partial match: ${client.id}, whatsappId: ${client.whatsappId}, phone: ${client.phone}`);
        // Обновляем whatsappId на полный номер, если он был коротким
        const oldWhatsappId = client.whatsappId;
        if (normalizedPhone.length > (oldWhatsappId?.length || 0)) {
          client.whatsappId = normalizedPhone;
          await this.clientsRepository.save(client);
          this.logger.log(`Updated client whatsappId from ${oldWhatsappId} to ${normalizedPhone}`);
        }
      }
    }

    if (!client) {
      // Используем имя отправителя или создаем имя из номера
      const name = senderName || `WhatsApp ${normalizedPhone}`;

      // ВАЖНО: Если передан chatId, сохраняем его как whatsappId для точного совпадения
      // Это важно для outgoingMessageReceived, чтобы сообщения попадали в тот же чат
      const whatsappIdToSave = (chatId && chatId.includes('@c.us')) ? chatId : normalizedPhone;

      // Создаем нового клиента
      client = this.clientsRepository.create({
        name,
        phone: normalizedPhone,
        whatsappId: whatsappIdToSave,
        status: 'active',
      });

      client = await this.clientsRepository.save(client);
      this.logger.log(`Created new client: ${client.id} for phone ${normalizedPhone}, whatsappId: ${whatsappIdToSave}`);
    } else {
      this.logger.log(`Found existing client: ${client.id}, name: ${client.name}, whatsappId: ${client.whatsappId}, phone: ${client.phone}`);
      
      // ВАЖНО: Если передан chatId и он содержит @c.us, обновляем whatsappId на полный chatId
      // Это важно для outgoingMessageReceived, чтобы сообщения попадали в тот же чат
      if (chatId && chatId.includes('@c.us')) {
        if (client.whatsappId !== chatId) {
          const oldWhatsappId = client.whatsappId;
          client.whatsappId = chatId;
          await this.clientsRepository.save(client);
          this.logger.log(`Updated client whatsappId from ${oldWhatsappId} to ${chatId} (for outgoingMessageReceived)`);
        }
      } else {
        // Обновляем WhatsApp ID, если его нет или если новый номер длиннее (более полный)
        if (!client.whatsappId || (normalizedPhone.length > client.whatsappId.length && !normalizedPhone.includes(client.whatsappId))) {
          const oldWhatsappId = client.whatsappId;
          client.whatsappId = normalizedPhone;
          await this.clientsRepository.save(client);
          this.logger.log(`Updated client whatsappId from ${oldWhatsappId} to ${normalizedPhone}`);
        }
      }
      
      // Обновляем phone, если его нет
      if (!client.phone) {
        client.phone = normalizedPhone;
        await this.clientsRepository.save(client);
        this.logger.log(`Updated client phone to ${normalizedPhone}`);
      }
      
      // Обновляем имя, если оно было передано и отличается
      if (senderName && client.name !== senderName && !client.name.includes('WhatsApp')) {
        client.name = senderName;
        await this.clientsRepository.save(client);
        this.logger.log(`Updated client name to ${senderName}`);
      }
    }

    return client;
  }

  /**
   * Найти или создать тикет для клиента
   */
  private async findOrCreateTicket(client: Client): Promise<Ticket | null> {
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
        // Если нет админа, просто возвращаем null - сообщение все равно сохранится
        this.logger.warn('Admin user not found for ticket creation. Message will be saved without ticket.');
        return null;
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
  async sendMessage(sendMessageDto: SendMessageDto, user: User | null): Promise<any> {
    // Объявляем chatId на уровне функции, чтобы он был доступен в catch блоке
    let chatId = '';
    
    try {
      const { phoneNumber, message, ticketId } = sendMessageDto;

      let client: Client | null = null;

      // Проверяем, является ли это групповым чатом (phoneNumber содержит @g.us)
      if (phoneNumber.includes('@g.us')) {
        // Это групповой чат - ищем клиента по whatsappId напрямую
        this.logger.log(`🔍 GROUP CHAT SEND - Searching for client with whatsappId: ${phoneNumber}`);
        client = await this.clientsRepository.findOne({
          where: { whatsappId: phoneNumber },
        });
        
        if (!client) {
          this.logger.warn(`⚠️ Client not found by whatsappId, searching in notes...`);
          // Если не нашли по whatsappId, ищем по notes
          const allClients = await this.clientsRepository.find();
          client = allClients.find((c) => 
            c.notes && c.notes.includes(`Group: ${phoneNumber}`)
          ) || null;
          
          if (client) {
            this.logger.log(`✅ Found client by notes, updating whatsappId to ${phoneNumber}`);
            // Обновляем whatsappId для будущих использований
            client.whatsappId = phoneNumber;
            await this.clientsRepository.save(client);
          }
        }
        
        if (!client) {
          this.logger.error(`❌ GROUP CHAT NOT FOUND: ${phoneNumber}`);
          const allGroupClients = (await this.clientsRepository.find()).filter(c => c.whatsappId?.includes('@g.us'));
          this.logger.error(`   Available clients with @g.us (${allGroupClients.length}):`, 
            allGroupClients.map(c => ({
              id: c.id,
              whatsappId: c.whatsappId,
              name: c.name,
            }))
          );
          throw new NotFoundException(`Групповой чат с ID ${phoneNumber} не найден. Убедитесь, что сообщения из этой группы были получены.`);
        }
        
        this.logger.log(`✅ GROUP CHAT CLIENT FOUND: ${client.id}, whatsappId: ${client.whatsappId}, name: ${client.name}`);
      } else {
        // Личный чат - нормализуем номер телефона
        let normalizedPhone = phoneNumber.replace(/[+\s()\-]/g, '');
        
        // Убираем ведущие нули и код страны если он дублируется
        // Например: 877055837474 -> 77055837474
        if (normalizedPhone.startsWith('8') && normalizedPhone.length > 11) {
          normalizedPhone = '7' + normalizedPhone.substring(1);
        }
        
        // Если номер начинается не с 7, добавляем 7 (для Казахстана и России)
        if (!normalizedPhone.startsWith('7') && normalizedPhone.length >= 10) {
          normalizedPhone = '7' + normalizedPhone;
        }

        this.logger.log(`Sending message to normalized phone: ${normalizedPhone} (original: ${phoneNumber})`);

        // Находим клиента - ищем по разным вариантам номера
        client = await this.clientsRepository.findOne({
          where: [
            { phone: normalizedPhone },
            { whatsappId: normalizedPhone },
          ],
        });

        // Если не нашли, ищем по частичному совпадению
        if (!client) {
          this.logger.log(`Client not found by exact match, searching by partial match...`);
          const allClients = await this.clientsRepository.find({
            where: [
              { phone: Not(IsNull()) },
              { whatsappId: Not(IsNull()) },
            ],
          });
          
          client = allClients.find((c) => {
            const clientPhone = (c.phone || '').replace(/[+\s()\-]/g, '');
            // Извлекаем номер из whatsappId, если он в формате phone@c.us
            const clientWhatsappIdNumber = (c.whatsappId || '').includes('@c.us') 
              ? (c.whatsappId || '').split('@')[0].replace(/[+\s()\-]/g, '')
              : (c.whatsappId || '').replace(/[+\s()\-]/g, '');
            
            // Проверяем совпадение по последним цифрам или полное совпадение
            return normalizedPhone === clientPhone || 
                   normalizedPhone === clientWhatsappIdNumber ||
                   normalizedPhone.endsWith(clientPhone) ||
                   normalizedPhone.endsWith(clientWhatsappIdNumber) ||
                   clientPhone.endsWith(normalizedPhone) ||
                   clientWhatsappIdNumber.endsWith(normalizedPhone);
          }) || null;
        }

        if (!client) {
          throw new NotFoundException(`Клиент с номером ${phoneNumber} не найден. Нормализованный номер: ${normalizedPhone}`);
        }
      }

      this.logger.log(`Found client: ${client.id}, phone: ${client.phone}, whatsappId: ${client.whatsappId}`);

      // Определяем chatId для отправки
      // chatId уже объявлен на уровне функции
      
      // Проверяем, является ли это групповым чатом
      // Для групп whatsappId содержит полный groupChatId (например, "120363423109359867@g.us")
      if (client.whatsappId && client.whatsappId.includes('@g.us')) {
        // Это групповой чат - используем whatsappId как chatId
        chatId = client.whatsappId;
        this.logger.log(`Group chat detected, using groupChatId from whatsappId: ${chatId}`);
      } else if (client.notes && client.notes.includes('Group:')) {
        // Извлекаем chatId группы из notes (fallback)
        // Формат: "Group: 120363423109359867@g.us\nGroup Name: Название группы"
        const groupMatch = client.notes.match(/Group: ([^\n]+)/);
        if (groupMatch && groupMatch[1]) {
          chatId = groupMatch[1].trim();
          
          // Проверяем, что chatId в правильном формате для группы
          if (!chatId.includes('@g.us')) {
            this.logger.error(`Invalid group chatId format: ${chatId}. Expected format: group_id@g.us`);
            throw new BadRequestException(`Неверный формат ID группы: ${chatId}. Ожидается формат: group_id@g.us`);
          }
          
          // Обновляем whatsappId для будущих использований
          client.whatsappId = chatId;
          await this.clientsRepository.save(client);
          
          this.logger.log(`Group chat detected, using groupChatId from notes: ${chatId}`);
        } else {
          this.logger.warn(`Group chat detected but groupChatId not found in notes: ${client.notes}`);
          throw new BadRequestException('Не удалось найти ID группы для отправки сообщения. Убедитесь, что клиент связан с групповым чатом.');
        }
      } else {
        // Личный чат - формируем chatId для Green API (формат: "79001234567@c.us")
        // Нормализуем номер телефона
        let normalizedPhoneForChat = phoneNumber.replace(/[+\s()\-]/g, '');
        
        // Убираем ведущие нули и код страны если он дублируется
        if (normalizedPhoneForChat.startsWith('8') && normalizedPhoneForChat.length > 11) {
          normalizedPhoneForChat = '7' + normalizedPhoneForChat.substring(1);
        }
        
        // Если номер начинается не с 7, добавляем 7 (для Казахстана и России)
        if (!normalizedPhoneForChat.startsWith('7') && normalizedPhoneForChat.length >= 10) {
          normalizedPhoneForChat = '7' + normalizedPhoneForChat;
        }
        
        // Убеждаемся, что номер в правильном формате (только цифры)
        const cleanPhone = normalizedPhoneForChat.replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 10) {
          throw new BadRequestException(`Неверный формат номера телефона: ${phoneNumber}`);
        }
        
        chatId = `${cleanPhone}@c.us`;
        this.logger.log(`Personal chat, formatted chatId: ${chatId}`);
        
        // ВАЖНО: Обновляем whatsappId клиента на полный chatId (phone@c.us)
        // Это гарантирует, что outgoingMessageReceived найдет правильного клиента
        if (client.whatsappId !== chatId) {
          const oldWhatsappId = client.whatsappId;
          client.whatsappId = chatId;
          await this.clientsRepository.save(client);
          this.logger.log(`Updated client whatsappId from ${oldWhatsappId} to ${chatId} (for outgoingMessageReceived matching)`);
        }
      }

      // Проверяем, что сообщение не пустое (WhatsApp не разрешает отправлять пустые сообщения)
      if (!message || message.trim() === '') {
        throw new BadRequestException('Нельзя отправить пустое сообщение. WhatsApp не разрешает отправку пустых сообщений.');
      }

      // Формируем URL для отправки сообщения через Green API
      const url = `${this.apiUrl}/waInstance${this.idInstance}/sendMessage/${this.apiTokenInstance}`;
      
      this.logger.log(`📤 Sending message to chatId: ${chatId}, message length: ${message.length}`);
      this.logger.debug(`Full send request - chatId: ${chatId}, isGroup: ${chatId.includes('@g.us')}, clientId: ${client.id}`);

      // Формируем payload для Green API
      const payload = {
        chatId: chatId,
        message: message.trim(), // Убираем пробелы в начале и конце
      };

      // Отправляем запрос
      this.logger.log(`📤 Sending POST request to: ${url}`);
      this.logger.log(`📤 Payload: ${JSON.stringify(payload, null, 2)}`);
      
      let response: any;
      try {
        response = await firstValueFrom(
          this.httpService.post(url, payload, {
            headers: {
              'Content-Type': 'application/json',
            },
          }),
        );

        this.logger.log(`📥 Response from Green API: ${JSON.stringify(response.data, null, 2)}`);

        const messageId = response.data?.idMessage;

        if (!messageId) {
          // Проверяем, не является ли это ошибкой квоты
          if (response.data?.invokeStatus || response.data?.correspondentsStatus) {
            // Это ошибка квоты - пробрасываем дальше для обработки в catch
            throw new Error(JSON.stringify(response.data));
          }
          
          this.logger.error(`❌ No messageId in response: ${JSON.stringify(response.data, null, 2)}`);
          throw new BadRequestException(`Не удалось получить ID сообщения от Green API. Ответ: ${JSON.stringify(response.data)}`);
        }
      } catch (error: any) {
        // Если это ошибка квоты в response.data, обрабатываем её
        if (error.response?.data?.invokeStatus || error.response?.data?.correspondentsStatus) {
          // Пробрасываем дальше для обработки в основном catch блоке
          throw error;
        }
        // Если это строка с JSON (из нашего throw выше), парсим её
        if (typeof error.message === 'string' && error.message.startsWith('{')) {
          try {
            const errorData = JSON.parse(error.message);
            if (errorData.invokeStatus || errorData.correspondentsStatus) {
              // Это ошибка квоты - пробрасываем дальше
              error.response = { data: errorData };
              throw error;
            }
          } catch (parseError) {
            // Не JSON, пробрасываем дальше
          }
        }
        throw error;
      }

      const messageId = response.data?.idMessage;

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

      if (chatId.includes('@g.us')) {
        this.logger.log(`✅ GROUP CHAT MESSAGE SENT:`);
        this.logger.log(`  - messageId: ${messageId}`);
        this.logger.log(`  - groupChatId: ${chatId}`);
        this.logger.log(`  - clientId: ${client.id}`);
        this.logger.log(`  - content: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);
        this.logger.log(`  - savedMessageId: ${savedMessage.id}`);
        this.logger.log(`  - direction: ${savedMessage.direction}`);
      } else {
        this.logger.log(`Message sent: ${messageId} to ${phoneNumber}`);
      }

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
        const responseData = error.response.data;
        
        // Проверяем на quotaExceeded / QUOTE_ALLOWED
        if (responseData.invokeStatus?.status === 'QUOTE_ALLOWED' || 
            responseData.correspondentsStatus?.status === 'CORRESPONDENTS_QUOTE_EXCEEDED') {
          const description = responseData.invokeStatus?.description || 
                            responseData.correspondentsStatus?.description || 
                            'Monthly quota has been exceeded';
          
          // Извлекаем список разрешенных контактов
          const allowedMatch = description.match(/numbers: ([^.]+)/);
          const allowedContacts = allowedMatch ? allowedMatch[1] : 'N/A';
          
          this.logger.warn(`⚠️ Quota exceeded for sending message`);
          this.logger.warn(`  - Allowed contacts: ${allowedContacts}`);
          this.logger.warn(`  - Attempted chatId: ${chatId}`);
          
          // Проверяем, является ли это групповым чатом
          const isGroup = chatId.includes('@g.us');
          
          if (isGroup) {
            throw new BadRequestException(
              `Не удалось отправить сообщение в группу. ` +
              `На бесплатном тарифе Green API можно работать только с 3 чатами в месяц. ` +
              `Группа "${chatId}" не входит в разрешенные контакты. ` +
              `Разрешенные контакты: ${allowedContacts}. ` +
              `Для работы с группами перейдите на бизнес-тариф: https://console.green-api.com`
            );
          } else {
            throw new BadRequestException(
              `Не удалось отправить сообщение. ` +
              `На бесплатном тарифе Green API можно работать только с 3 чатами в месяц. ` +
              `Контакт "${chatId}" не входит в разрешенные контакты. ` +
              `Разрешенные контакты: ${allowedContacts}. ` +
              `Для работы с большим количеством контактов перейдите на бизнес-тариф: https://console.green-api.com`
            );
          }
        }
        
        const errorMessage = responseData.error || responseData.message || 'Ошибка при отправке сообщения';
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

  /**
   * Получить статистику сообщений для диагностики
   */
  async getStats() {
    const totalMessages = await this.messagesRepository.count({
      where: { channel: MessageChannel.WHATSAPP },
    });

    const recentMessages = await this.messagesRepository.find({
      where: { channel: MessageChannel.WHATSAPP },
      order: { createdAt: 'DESC' },
      take: 10,
      relations: ['client'],
    });

    const clientsWithWhatsApp = await this.clientsRepository.count({
      where: { whatsappId: Not(IsNull()) },
    });

    return {
      totalMessages,
      recentMessages: recentMessages.map((msg) => ({
        id: msg.id,
        content: msg.content.substring(0, 50),
        clientId: msg.clientId,
        clientName: msg.client?.name,
        clientWhatsappId: msg.client?.whatsappId,
        direction: msg.direction,
        createdAt: msg.createdAt,
        externalId: msg.externalId,
      })),
      clientsWithWhatsApp,
    };
  }
}

