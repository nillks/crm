import api from './api';

export const MessageChannel = {
  WHATSAPP: 'whatsapp',
  TELEGRAM: 'telegram',
  INSTAGRAM: 'instagram',
} as const;

export type MessageChannel = typeof MessageChannel[keyof typeof MessageChannel];

export const MessageDirection = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
} as const;

export type MessageDirection = typeof MessageDirection[keyof typeof MessageDirection];

export interface Message {
  id: string;
  channel: MessageChannel;
  direction: MessageDirection;
  content: string;
  externalId?: string;
  clientId: string;
  ticketId?: string;
  isRead: boolean;
  isDelivered: boolean;
  deliveredAt?: string;
  createdAt: string;
  client?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  ticket?: {
    id: string;
    title: string;
    status: string;
  };
}

export interface FilterMessagesDto {
  channel?: MessageChannel;
  direction?: MessageDirection;
  clientId?: string;
  ticketId?: string;
  isRead?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  include?: string; // client,ticket
}

export interface PaginatedMessages {
  data: Message[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SendMessageDto {
  recipientId: string;
  message: string;
  ticketId?: string;
}

export const messagesService = {
  /**
   * Получить список сообщений с пагинацией и фильтрами
   * Временное решение: получаем через клиентов, так как отдельного endpoint /messages пока нет
   */
  async getMessages(params?: FilterMessagesDto): Promise<PaginatedMessages> {
    // TODO: Создать отдельный endpoint /messages на backend
    // Пока используем клиентов с include=messages
    const clientId = params?.clientId;
    
    if (clientId) {
      // Получаем сообщения конкретного клиента
      const { clientsService } = await import('./clients.service');
      const client = await clientsService.getClientById(clientId, 'messages,ticket');
      
      let messages = (client.messages || []) as Message[];
      
      console.log('Raw messages from client:', {
        clientId,
        messagesCount: messages.length,
        messages: messages,
        clientWhatsappId: client.whatsappId,
        clientTelegramId: client.telegramId,
        clientInstagramId: client.instagramId,
      });
      
      // Убеждаемся, что сообщения имеют правильный формат
      messages = messages.map((msg: any) => {
        // Преобразуем дату если она в формате Date
        let createdAt = msg.createdAt;
        if (createdAt instanceof Date) {
          createdAt = createdAt.toISOString();
        } else if (typeof createdAt === 'string') {
          // Уже строка
        } else {
          createdAt = new Date().toISOString();
        }
        
        // Нормализуем channel - может быть в разных форматах
        let channel = msg.channel;
        if (channel) {
          const channelStr = String(channel).toLowerCase().trim();
          if (channelStr === 'whatsapp' || channelStr === 'wa' || channelStr === 'whats_app') {
            channel = MessageChannel.WHATSAPP;
          } else if (channelStr === 'telegram' || channelStr === 'tg' || channelStr === 'tele_gram') {
            channel = MessageChannel.TELEGRAM;
          } else if (channelStr === 'instagram' || channelStr === 'ig' || channelStr === 'insta_gram') {
            channel = MessageChannel.INSTAGRAM;
          } else {
            // Если не распознали - проверяем через enum (учитываем возможные значения из БД)
            const upperChannel = channelStr.toUpperCase();
            if (upperChannel === 'WHATSAPP' || upperChannel === 'WA') {
              channel = MessageChannel.WHATSAPP;
            } else if (upperChannel === 'TELEGRAM' || upperChannel === 'TG') {
              channel = MessageChannel.TELEGRAM;
            } else if (upperChannel === 'INSTAGRAM' || upperChannel === 'IG') {
              channel = MessageChannel.INSTAGRAM;
            } else if (Object.values(MessageChannel).includes(channel as MessageChannel)) {
              // Уже правильный формат
            } else {
              console.warn('Invalid channel:', channel, 'defaulting to whatsapp. Original:', msg.channel);
              channel = MessageChannel.WHATSAPP;
            }
          }
        } else {
          console.warn('Channel is missing for message:', msg.id, 'defaulting to whatsapp');
          channel = MessageChannel.WHATSAPP;
        }
        
        // Нормализуем direction
        let direction = msg.direction;
        if (direction) {
          direction = String(direction).toLowerCase();
          if (direction === 'inbound' || direction === 'incoming' || direction === 'received') {
            direction = MessageDirection.INBOUND;
          } else if (direction === 'outbound' || direction === 'outgoing' || direction === 'sent') {
            direction = MessageDirection.OUTBOUND;
          } else {
            // Если не распознали - проверяем через enum
            if (!Object.values(MessageDirection).includes(direction as MessageDirection)) {
              console.warn('Invalid direction:', direction, 'defaulting to inbound');
              direction = MessageDirection.INBOUND;
            }
          }
        } else {
          direction = MessageDirection.INBOUND;
        }
        
        return {
          ...msg,
          id: msg.id || `temp-${Date.now()}-${Math.random()}`,
          channel: channel as MessageChannel,
          direction: direction as MessageDirection,
          content: msg.content || msg.textMessage || msg.text || '[Сообщение без текста]',
          clientId: msg.clientId || clientId,
          ticketId: msg.ticketId || undefined,
          isRead: msg.isRead !== undefined ? Boolean(msg.isRead) : false,
          isDelivered: msg.isDelivered !== undefined ? Boolean(msg.isDelivered) : false,
          createdAt: createdAt,
        };
      });
      
      console.log('Processed messages:', {
        messagesCount: messages.length,
        messages: messages,
        channels: [...new Set(messages.map(m => m.channel))],
      });
      
      // Применяем фильтры на frontend
      if (params?.channel) {
        const filterChannel = params.channel;
        const beforeFilter = messages.length;
        const filterChannelLower = String(filterChannel).toLowerCase().trim();
        
        messages = messages.filter((msg) => {
          const msgChannel = String(msg.channel || '').toLowerCase().trim();
          
          // Прямое совпадение
          if (msgChannel === filterChannelLower) {
            return true;
          }
          
          // Специальные случаи для WhatsApp
          if (filterChannelLower === 'whatsapp' || filterChannelLower === MessageChannel.WHATSAPP.toLowerCase()) {
            return msgChannel === 'whatsapp' || msgChannel === 'wa' || msgChannel === 'whats_app';
          }
          
          // Специальные случаи для Telegram
          if (filterChannelLower === 'telegram' || filterChannelLower === MessageChannel.TELEGRAM.toLowerCase()) {
            return msgChannel === 'telegram' || msgChannel === 'tg' || msgChannel === 'tele_gram';
          }
          
          // Специальные случаи для Instagram
          if (filterChannelLower === 'instagram' || filterChannelLower === MessageChannel.INSTAGRAM.toLowerCase()) {
            return msgChannel === 'instagram' || msgChannel === 'ig' || msgChannel === 'insta_gram';
          }
          
          return false;
        });
        
        console.log('Filtered by channel:', {
          filterChannel: params.channel,
          filterChannelLower,
          beforeFilter,
          afterFilter: messages.length,
          availableChannels: [...new Set(messages.map(m => m.channel))],
          allChannelsBeforeFilter: [...new Set((client.messages || []).map((m: any) => m.channel))],
        });
      }
      if (params?.direction) {
        messages = messages.filter((msg) => msg.direction === params.direction);
      }
      if (params?.ticketId) {
        messages = messages.filter((msg) => msg.ticketId === params.ticketId);
      }
      if (params?.isRead !== undefined) {
        messages = messages.filter((msg) => msg.isRead === params.isRead);
      }
      
      // Сортировка
      const sortBy = params?.sortBy || 'createdAt';
      const sortOrder = params?.sortOrder || 'ASC';
      messages.sort((a, b) => {
        const aVal = a[sortBy as keyof Message];
        const bVal = b[sortBy as keyof Message];
        if (aVal === undefined || bVal === undefined) return 0;
        
        // Для дат используем правильное сравнение
        if (sortBy === 'createdAt' || sortBy === 'deliveredAt') {
          const aDate = new Date(aVal as string).getTime();
          const bDate = new Date(bVal as string).getTime();
          return sortOrder === 'ASC' ? aDate - bDate : bDate - aDate;
        }
        
        // Для остальных полей
        if (sortOrder === 'ASC') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
      
      // Пагинация
      const page = params?.page || 1;
      const limit = params?.limit || 50;
      const skip = (page - 1) * limit;
      const paginatedMessages = messages.slice(skip, skip + limit);
      
      return {
        data: paginatedMessages,
        total: messages.length,
        page,
        limit,
        totalPages: Math.ceil(messages.length / limit),
      };
    } else {
      // Получаем все сообщения через список клиентов
      const { clientsService } = await import('./clients.service');
      const clientsResponse = await clientsService.getClients({
        page: 1,
        limit: 100,
        include: 'messages',
      });
      
      let allMessages: Message[] = [];
      clientsResponse.data.forEach((client) => {
        if (client.messages) {
          allMessages = [...allMessages, ...(client.messages as Message[])];
        }
      });
      
      // Применяем фильтры
      if (params?.channel) {
        allMessages = allMessages.filter((msg) => msg.channel === params.channel);
      }
      if (params?.direction) {
        allMessages = allMessages.filter((msg) => msg.direction === params.direction);
      }
      if (params?.ticketId) {
        allMessages = allMessages.filter((msg) => msg.ticketId === params.ticketId);
      }
      
      // Сортировка
      const sortBy = params?.sortBy || 'createdAt';
      const sortOrder = params?.sortOrder || 'ASC';
      allMessages.sort((a, b) => {
        const aVal = a[sortBy as keyof Message];
        const bVal = b[sortBy as keyof Message];
        if (aVal === undefined || bVal === undefined) return 0;
        if (sortOrder === 'ASC') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
      
      // Пагинация
      const page = params?.page || 1;
      const limit = params?.limit || 50;
      const skip = (page - 1) * limit;
      const paginatedMessages = allMessages.slice(skip, skip + limit);
      
      return {
        data: paginatedMessages,
        total: allMessages.length,
        page,
        limit,
        totalPages: Math.ceil(allMessages.length / limit),
      };
    }
  },

  /**
   * Получить сообщения по клиенту
   */
  async getMessagesByClient(clientId: string, params?: Omit<FilterMessagesDto, 'clientId'>): Promise<PaginatedMessages> {
    return this.getMessages({ ...params, clientId });
  },

  /**
   * Отправить сообщение через WhatsApp
   */
  async sendWhatsAppMessage(dto: { phoneNumber: string; message: string; ticketId?: string }): Promise<any> {
    const response = await api.post('/whatsapp/send', dto);
    return response.data;
  },

  /**
   * Отправить сообщение через Telegram
   */
  async sendTelegramMessage(dto: { chatId: string; message: string; ticketId?: string }): Promise<any> {
    const response = await api.post('/telegram/send', dto);
    return response.data;
  },

  /**
   * Отправить сообщение через Instagram
   */
  async sendInstagramMessage(dto: { recipientId: string; message: string; ticketId?: string }): Promise<any> {
    const response = await api.post('/instagram/send', dto);
    return response.data;
  },

  /**
   * Отметить сообщение как прочитанное
   * TODO: Реализовать на backend
   */
  async markAsRead(_messageId: string): Promise<void> {
    // await api.patch(`/messages/${messageId}/read`);
    console.warn('markAsRead not implemented on backend yet');
  },
};


