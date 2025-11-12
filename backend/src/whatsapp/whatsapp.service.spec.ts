import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsAppService } from './whatsapp.service';
import { Message } from '../entities/message.entity';
import { Client } from '../entities/client.entity';
import { Ticket } from '../entities/ticket.entity';
import { User } from '../entities/user.entity';
import { of, throwError } from 'rxjs';

describe('WhatsAppService', () => {
  let service: WhatsAppService;
  let messagesRepository: Repository<Message>;
  let clientsRepository: Repository<Client>;
  let ticketsRepository: Repository<Ticket>;
  let httpService: HttpService;

  const mockMessageRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockClientRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockTicketRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        WHATSAPP_API_URL: 'https://7107.api.green-api.com',
        WHATSAPP_ID_INSTANCE: '7107377559',
        WHATSAPP_API_TOKEN_INSTANCE: 'test-token',
        WHATSAPP_PHONE_NUMBER: '77471400312',
      };
      return config[key] || defaultValue || '';
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: getRepositoryToken(Message),
          useValue: mockMessageRepository,
        },
        {
          provide: getRepositoryToken(Client),
          useValue: mockClientRepository,
        },
        {
          provide: getRepositoryToken(Ticket),
          useValue: mockTicketRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
    messagesRepository = module.get<Repository<Message>>(getRepositoryToken(Message));
    clientsRepository = module.get<Repository<Client>>(getRepositoryToken(Client));
    ticketsRepository = module.get<Repository<Ticket>>(getRepositoryToken(Ticket));
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyWebhook', () => {
    it('should return challenge for any request (Green API compatibility)', () => {
      const result = service.verifyWebhook('subscribe', 'token', 'test-challenge');
      expect(result).toBe('test-challenge');
    });
  });

  describe('handleWebhook - incomingMessageReceived', () => {
    it('should process incoming message and save to DB', async () => {
      const webhookData = {
        typeWebhook: 'incomingMessageReceived',
        timestamp: 1234567890,
        idMessage: 'test-123',
        data: {
          typeMessage: 'textMessage',
          chatId: '79991234567@c.us',
          senderId: '79991234567@c.us',
          senderName: 'Test User',
          textMessage: 'Тестовое сообщение',
          idMessage: 'test-123',
          timestamp: 1234567890,
        },
      };

      const mockClient = {
        id: 'client-123',
        name: 'Test User',
        phone: '79991234567',
        whatsappId: '79991234567',
        status: 'active',
      };

      const mockTicket = {
        id: 'ticket-123',
        clientId: 'client-123',
        channel: 'whatsapp',
        status: 'new',
      };

      const mockMessage = {
        id: 'message-123',
        channel: 'whatsapp',
        direction: 'inbound',
        content: 'Тестовое сообщение',
        externalId: 'test-123',
        clientId: 'client-123',
        ticketId: 'ticket-123',
      };

      mockClientRepository.findOne.mockResolvedValue(null);
      mockClientRepository.create.mockReturnValue(mockClient);
      mockClientRepository.save.mockResolvedValue(mockClient);
      mockTicketRepository.findOne.mockResolvedValue(null);
      mockTicketRepository.create.mockReturnValue(mockTicket);
      mockTicketRepository.save.mockResolvedValue(mockTicket);
      mockMessageRepository.findOne.mockResolvedValue(null);
      mockMessageRepository.create.mockReturnValue(mockMessage);
      mockMessageRepository.save.mockResolvedValue(mockMessage);

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'admin-123', role: { name: 'admin' } }),
      };
      mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.handleWebhook(webhookData);

      expect(mockClientRepository.findOne).toHaveBeenCalled();
      expect(mockClientRepository.save).toHaveBeenCalled();
      expect(mockTicketRepository.findOne).toHaveBeenCalled();
      expect(mockMessageRepository.save).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should send message via Green API', async () => {
      const sendMessageDto = {
        phoneNumber: '79991234567',
        message: 'Тестовое сообщение',
      };

      const mockClient = {
        id: 'client-123',
        phone: '79991234567',
        whatsappId: '79991234567',
      };

      const mockResponse = {
        data: {
          idMessage: 'green-api-123',
        },
      };

      mockClientRepository.findOne.mockResolvedValue(mockClient);
      mockHttpService.post.mockReturnValue(of(mockResponse));
      mockMessageRepository.create.mockReturnValue({
        id: 'message-123',
        externalId: 'green-api-123',
      });
      mockMessageRepository.save.mockResolvedValue({
        id: 'message-123',
        externalId: 'green-api-123',
      });

      const result = await service.sendMessage(sendMessageDto, {} as User);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/sendMessage/'),
        {
          chatId: '79991234567@c.us',
          message: 'Тестовое сообщение',
        },
        expect.any(Object),
      );
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('green-api-123');
    });

    it('should throw error if client not found', async () => {
      const sendMessageDto = {
        phoneNumber: '79991234567',
        message: 'Тестовое сообщение',
      };

      mockClientRepository.findOne.mockResolvedValue(null);

      await expect(service.sendMessage(sendMessageDto, {} as User)).rejects.toThrow(
        'Клиент с номером 79991234567 не найден',
      );
    });
  });

  describe('getConfig', () => {
    it('should return configuration without sensitive data', () => {
      const config = service.getConfig();

      expect(config.apiUrl).toBe('https://7107.api.green-api.com');
      expect(config.idInstance).toBe('7107377559');
      expect(config.phoneNumber).toBe('77471400312');
      expect(config.apiToken).toBe('***configured***');
      expect(config.isConfigured).toBe(true);
    });
  });
});

