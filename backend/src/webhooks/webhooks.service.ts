import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketChannel, TicketStatus } from '../entities/ticket.entity';
import { Client } from '../entities/client.entity';
import { User, RoleName } from '../entities/user.entity';
import { TicketsService } from '../tickets/tickets.service';
import { ClientsService } from '../clients/clients.service';

export interface ContactFormData {
  name: string;
  email?: string;
  phone?: string;
  message: string;
  subject?: string;
  source?: string; // Источник заявки (например, 'website', 'landing-page')
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  [key: string]: any; // Дополнительные поля
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private ticketsService: TicketsService,
    private clientsService: ClientsService,
  ) {}

  /**
   * Обработка формы обратной связи с сайта
   */
  async handleContactForm(data: ContactFormData): Promise<Ticket> {
    this.logger.log(`📝 Processing contact form: ${JSON.stringify(data)}`);

    // Валидация обязательных полей
    if (!data.name || !data.message) {
      throw new BadRequestException('Имя и сообщение обязательны для заполнения');
    }

    // Находим или создаем клиента
    let client: Client;
    const phone = data.phone?.replace(/\D/g, ''); // Убираем все нецифровые символы
    const email = data.email?.toLowerCase().trim();

    if (phone) {
      // Ищем клиента по телефону
      client = await this.clientsRepository.findOne({
        where: { phone },
      });
    } else if (email) {
      // Ищем клиента по email
      client = await this.clientsRepository.findOne({
        where: { email },
      });
    }

    if (!client) {
      // Создаем нового клиента
      const clientData: any = {
        name: data.name,
        phone: phone || undefined,
        email: email || undefined,
        status: 'active',
        tags: data.source ? [data.source] : [],
        customFields: {
          utmSource: data.utmSource,
          utmMedium: data.utmMedium,
          utmCampaign: data.utmCampaign,
          source: data.source || 'website',
        },
      };

      client = await this.clientsService.create(clientData);
      this.logger.log(`✅ Created new client: ${client.id} - ${client.name}`);
    } else {
      // Обновляем информацию о клиенте, если есть новые данные
      if (email && !client.email) {
        client.email = email;
      }
      if (phone && !client.phone) {
        client.phone = phone;
      }
      if (data.name && client.name !== data.name) {
        client.name = data.name;
      }

      // Обновляем кастомные поля с UTM метками
      if (!client.customFields) {
        client.customFields = {};
      }
      if (data.utmSource) client.customFields.utmSource = data.utmSource;
      if (data.utmMedium) client.customFields.utmMedium = data.utmMedium;
      if (data.utmCampaign) client.customFields.utmCampaign = data.utmCampaign;
      if (data.source) client.customFields.source = data.source;

      await this.clientsRepository.save(client);
      this.logger.log(`✅ Updated client: ${client.id} - ${client.name}`);
    }

    // Находим администратора для создания тикета
    const adminUser = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('role.name = :roleName', { roleName: RoleName.ADMIN })
      .getOne();

    if (!adminUser) {
      throw new BadRequestException('Администратор не найден. Невозможно создать тикет.');
    }

    // Создаем тикет
    const ticket = this.ticketsRepository.create({
      title: data.subject || `Заявка с сайта от ${data.name}`,
      description: data.message,
      clientId: client.id,
      createdById: adminUser.id,
      channel: TicketChannel.WEBSITE,
      status: TicketStatus.NEW,
      priority: 0,
      metadata: {
        source: data.source || 'website',
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        formData: data,
      },
    });

    const savedTicket = await this.ticketsRepository.save(ticket);
    this.logger.log(`✅ Created ticket from contact form: ${savedTicket.id}`);

    // Автоматическое распределение тикета
    try {
      await this.ticketsService.autoAssignTicket(savedTicket);
    } catch (error) {
      this.logger.warn(`Failed to auto-assign ticket: ${error.message}`);
    }

    return savedTicket;
  }
}

