import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { WABATemplate, WABATemplateStatus } from '../entities/waba-template.entity';
import { WABACampaign, WABACampaignStatus } from '../entities/waba-campaign.entity';
import { WABACredentials } from '../entities/waba-credentials.entity';
import { CreateWABATemplateDto } from './dto/create-waba-template.dto';
import { UpdateWABATemplateDto } from './dto/update-waba-template.dto';
import { CreateWABACampaignDto } from './dto/create-waba-campaign.dto';
import { CreateMassWABACampaignDto } from './dto/create-mass-campaign.dto';
import { CreateWABACredentialsDto, UpdateWABACredentialsDto } from './dto/waba-credentials.dto';
import { CampaignStatsFilterDto, CampaignStatsResponse } from './dto/campaign-stats.dto';
import { AIService } from '../ai/ai.service';
import { ClientsService } from '../clients/clients.service';
import * as crypto from 'crypto';

@Injectable()
export class WABAService implements OnModuleInit {
  private readonly logger = new Logger(WABAService.name);
  private readonly encryptionKey: string;
  private readonly facebookApiUrl = 'https://graph.facebook.com/v18.0';

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    @InjectRepository(WABATemplate)
    private templatesRepository: Repository<WABATemplate>,
    @InjectRepository(WABACampaign)
    private campaignsRepository: Repository<WABACampaign>,
    @InjectRepository(WABACredentials)
    private credentialsRepository: Repository<WABACredentials>,
    private aiService: AIService,
    private clientsService: ClientsService,
  ) {
    // Ключ шифрования из env (в production должен быть в Vault)
    this.encryptionKey = this.configService.get('WABA_ENCRYPTION_KEY', 'default-key-change-in-production');
  }

  async onModuleInit() {
    this.logger.log('WABA Service initialized');
  }

  /**
   * Шифрование токена
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.substring(0, 32)), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  /**
   * Расшифровка токена
   */
  private decrypt(text: string): string {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey.substring(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  /**
   * Получить активные credentials
   */
  private async getActiveCredentials(): Promise<WABACredentials | null> {
    return this.credentialsRepository.findOne({
      where: { isActive: true },
    });
  }

  /**
   * Получить расшифрованный access token
   */
  private async getAccessToken(): Promise<string | null> {
    const credentials = await this.getActiveCredentials();
    if (!credentials) return null;
    return this.decrypt(credentials.accessToken);
  }

  /**
   * Проверить баланс аккаунта через Facebook API
   */
  async checkBalance(): Promise<{ balance: number; currency: string } | null> {
    const credentials = await this.getActiveCredentials();
    if (!credentials) {
      return null;
    }

    const accessToken = this.decrypt(credentials.accessToken);

    try {
      // Получаем информацию о бизнес-аккаунте с балансом
      const response = await firstValueFrom(
        this.httpService.get(`${this.facebookApiUrl}/${credentials.businessAccountId}`, {
          params: {
            access_token: accessToken,
            fields: 'extended_credits',
          },
        }),
      );

      // Альтернативный способ: проверка через phone number
      let balance = 0;
      let currency = 'USD';

      if (response.data.extended_credits) {
        // Если есть информация о кредитах
        const credits = response.data.extended_credits.data;
        if (credits && credits.length > 0) {
          balance = parseFloat(credits[0].amount) || 0;
          currency = credits[0].currency || 'USD';
        }
      } else {
        // Пробуем получить баланс через phone number
        try {
          const phoneResponse = await firstValueFrom(
            this.httpService.get(`${this.facebookApiUrl}/${credentials.phoneNumberId}`, {
              params: {
                access_token: accessToken,
                fields: 'account_mode,balance',
              },
            }),
          );
          if (phoneResponse.data.balance) {
            balance = parseFloat(phoneResponse.data.balance) || 0;
          }
        } catch (phoneError) {
          this.logger.warn('Could not get balance from phone number, using default');
        }
      }

      // Обновляем баланс в credentials
      credentials.balance = balance;
      credentials.balanceLastChecked = new Date();
      await this.credentialsRepository.save(credentials);

      // Проверяем порог автопаузы
      if (credentials.autoPauseThreshold > 0 && balance < credentials.autoPauseThreshold) {
        if (!credentials.isPaused) {
          credentials.isPaused = true;
          await this.credentialsRepository.save(credentials);
          this.logger.warn(
            `⚠️ WABA auto-paused: balance ${balance} is below threshold ${credentials.autoPauseThreshold}`,
          );
        }
      } else if (credentials.isPaused && balance >= credentials.autoPauseThreshold) {
        credentials.isPaused = false;
        await this.credentialsRepository.save(credentials);
        this.logger.log(`✅ WABA auto-resumed: balance ${balance} is above threshold`);
      }

      return { balance, currency };
    } catch (error: any) {
      this.logger.error('Failed to check WABA balance:', error);
      return null;
    }
  }

  /**
   * Проверить, можно ли отправлять рассылки (не приостановлены ли из-за баланса)
   */
  private async canSendCampaigns(): Promise<boolean> {
    const credentials = await this.getActiveCredentials();
    if (!credentials) {
      return false;
    }

    // Если автопауза включена и баланс ниже порога
    if (credentials.isPaused) {
      return false;
    }

    // Проверяем баланс, если не проверяли более часа
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (!credentials.balanceLastChecked || credentials.balanceLastChecked < oneHourAgo) {
      const balanceInfo = await this.checkBalance();
      if (balanceInfo && balanceInfo.balance < (credentials.autoPauseThreshold || 0)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Создать шаблон в Facebook
   */
  async createTemplateInFacebook(dto: CreateWABATemplateDto): Promise<string> {
    const credentials = await this.getActiveCredentials();
    if (!credentials) {
      throw new BadRequestException('WABA credentials not configured');
    }

    const accessToken = this.decrypt(credentials.accessToken);

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.facebookApiUrl}/${credentials.businessAccountId}/message_templates`,
          {
            name: dto.name,
            category: dto.category,
            language: dto.language || 'ru',
            components: dto.components,
          },
          {
            params: {
              access_token: accessToken,
            },
          },
        ),
      );

      return response.data.id;
    } catch (error: any) {
      this.logger.error('Failed to create template in Facebook:', error.response?.data || error.message);
      throw new BadRequestException(
        `Failed to create template in Facebook: ${error.response?.data?.error?.message || error.message}`,
      );
    }
  }

  /**
   * Создать шаблон
   */
  async createTemplate(dto: CreateWABATemplateDto): Promise<WABATemplate> {
    // Проверяем лимит шаблонов (200/месяц)
    const monthlyLimit = 200;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyTemplates = await this.templatesRepository
      .createQueryBuilder('template')
      .where('template.createdAt >= :startOfMonth', { startOfMonth })
      .getCount();

    if (monthlyTemplates >= monthlyLimit) {
      throw new BadRequestException(
        `Достигнут месячный лимит шаблонов (${monthlyLimit}). Невозможно создать новый шаблон.`,
      );
    }

    // Проверяем уникальность имени
    const existing = await this.templatesRepository.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new BadRequestException(`Template with name "${dto.name}" already exists`);
    }

    // Создаем шаблон в Facebook
    let facebookTemplateId: string | null = null;
    try {
      facebookTemplateId = await this.createTemplateInFacebook(dto);
    } catch (error) {
      this.logger.warn('Failed to create template in Facebook, saving locally only:', error);
    }

    const template = this.templatesRepository.create({
      ...dto,
      status: WABATemplateStatus.PENDING,
      facebookTemplateId,
    });

    const saved = await this.templatesRepository.save(template);
    this.logger.log(`✅ WABA template created: ${saved.id} - ${saved.name}`);

    return saved;
  }

  /**
   * Получить все шаблоны
   */
  async findAllTemplates(): Promise<WABATemplate[]> {
    return this.templatesRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Получить шаблон по ID
   */
  async findTemplateById(id: string): Promise<WABATemplate> {
    const template = await this.templatesRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return template;
  }

  /**
   * Обновить шаблон
   */
  async updateTemplate(id: string, dto: UpdateWABATemplateDto): Promise<WABATemplate> {
    const template = await this.findTemplateById(id);

    Object.assign(template, dto);

    const updated = await this.templatesRepository.save(template);
    this.logger.log(`✅ WABA template updated: ${updated.id} - ${updated.name}`);

    return updated;
  }

  /**
   * Удалить шаблон
   */
  async deleteTemplate(id: string): Promise<void> {
    const template = await this.findTemplateById(id);
    await this.templatesRepository.remove(template);
    this.logger.log(`🗑️ WABA template deleted: ${id}`);
  }

  /**
   * Создать кампанию (рассылку)
   */
  async createCampaign(dto: CreateWABACampaignDto, createdById: string): Promise<WABACampaign> {
    const template = await this.findTemplateById(dto.templateId);

    const campaign = this.campaignsRepository.create({
      ...dto,
      createdById,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : new Date(),
      status: dto.status || WABACampaignStatus.PENDING,
    });

    const saved = await this.campaignsRepository.save(campaign);

    // Если статус SCHEDULED, отправляем сразу
    if (saved.status === WABACampaignStatus.SCHEDULED && saved.scheduledAt <= new Date()) {
      await this.sendCampaign(saved.id);
    }

    this.logger.log(`✅ WABA campaign created: ${saved.id}`);

    return saved;
  }

  /**
   * Создать массовую рассылку с фильтрацией клиентов
   */
  async createMassCampaign(
    dto: CreateMassWABACampaignDto,
    createdById: string,
  ): Promise<{ campaigns: WABACampaign[]; totalClients: number }> {
    const template = await this.findTemplateById(dto.templateId);

    // Получаем клиентов по фильтрам
    // Убираем пагинацию для получения всех клиентов
    const filterDto = {
      ...dto.clientFilters,
      page: 1,
      limit: dto.limit || 1000, // По умолчанию максимум 1000 клиентов
    };

    const clientsResult = await this.clientsService.findAll(filterDto);
    const clients = clientsResult.data;

    if (clients.length === 0) {
      throw new BadRequestException('Не найдено клиентов по указанным фильтрам');
    }

    // Фильтруем клиентов, у которых есть WhatsApp ID или телефон
    const validClients = clients.filter(
      (client) => client.whatsappId || client.phone,
    );

    if (validClients.length === 0) {
      throw new BadRequestException('У найденных клиентов нет WhatsApp ID или телефона');
    }

    this.logger.log(
      `📧 Creating mass campaign for ${validClients.length} clients (filtered from ${clients.length})`,
    );

    // Создаем кампании для каждого клиента
    const campaigns: WABACampaign[] = [];
    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : new Date();

    for (const client of validClients) {
      const campaign = this.campaignsRepository.create({
        templateId: dto.templateId,
        clientId: client.id,
        createdById,
        parameters: dto.parameters,
        scheduledAt,
        status: WABACampaignStatus.PENDING,
        metadata: {
          massCampaign: true,
          originalFilters: dto.clientFilters,
        },
      });

      const saved = await this.campaignsRepository.save(campaign);
      campaigns.push(saved);

      // Если статус SCHEDULED и время пришло, отправляем сразу
      if (saved.status === WABACampaignStatus.SCHEDULED && saved.scheduledAt <= new Date()) {
        try {
          await this.sendCampaign(saved.id);
        } catch (error) {
          this.logger.error(`Failed to send campaign ${saved.id}: ${error.message}`);
        }
      }
    }

    this.logger.log(`✅ Mass WABA campaign created: ${campaigns.length} campaigns`);

    return {
      campaigns,
      totalClients: validClients.length,
    };
  }

  /**
   * Отправить кампанию
   */
  async sendCampaign(campaignId: string): Promise<void> {
    const campaign = await this.campaignsRepository.findOne({
      where: { id: campaignId },
      relations: ['template', 'client'],
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${campaignId} not found`);
    }

    if (campaign.status === WABACampaignStatus.SENT) {
      throw new BadRequestException('Campaign already sent');
    }

    const credentials = await this.getActiveCredentials();
    if (!credentials) {
      throw new BadRequestException('WABA credentials not configured');
    }

    // Проверяем, можно ли отправлять (баланс и автопауза)
    const canSend = await this.canSendCampaigns();
    if (!canSend) {
      const balanceInfo = await this.checkBalance();
      const balance = balanceInfo?.balance ?? credentials.balance ?? 0;
      const threshold = credentials.autoPauseThreshold ?? 0;
      throw new BadRequestException(
        `Рассылки приостановлены. Баланс: ${balance}, порог: ${threshold}. Пополните баланс для продолжения рассылок.`,
      );
    }

    const accessToken = this.decrypt(credentials.accessToken);

    try {
      // Формируем сообщение для отправки
      const messageData = {
        messaging_product: 'whatsapp',
        to: campaign.client.phone || campaign.client.whatsappId,
        type: 'template',
        template: {
          name: campaign.template.name,
          language: {
            code: campaign.template.language || 'ru',
          },
          components: [
            {
              type: 'body',
              parameters: Object.entries(campaign.parameters).map(([key, value]) => ({
                type: 'text',
                text: value,
              })),
            },
          ],
        },
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.facebookApiUrl}/${credentials.phoneNumberId}/messages`,
          messageData,
          {
            params: {
              access_token: accessToken,
            },
          },
        ),
      );

      campaign.status = WABACampaignStatus.SENT;
      campaign.sentAt = new Date();
      campaign.facebookMessageId = response.data.messages[0]?.id || null;
      await this.campaignsRepository.save(campaign);

      // Увеличиваем счетчик использования шаблона
      campaign.template.usageCount += 1;
      await this.templatesRepository.save(campaign.template);

      this.logger.log(`✅ WABA campaign sent: ${campaignId}`);
    } catch (error: any) {
      campaign.status = WABACampaignStatus.FAILED;
      campaign.errorMessage = error.response?.data?.error?.message || error.message;
      await this.campaignsRepository.save(campaign);

      this.logger.error(`❌ Failed to send WABA campaign: ${campaignId}`, error);
      throw new BadRequestException(
        `Failed to send campaign: ${error.response?.data?.error?.message || error.message}`,
      );
    }
  }

  /**
   * Получить все кампании
   */
  async findAllCampaigns(): Promise<WABACampaign[]> {
    return this.campaignsRepository.find({
      relations: ['template', 'client', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Получить кампанию по ID
   */
  async findCampaignById(id: string): Promise<WABACampaign> {
    const campaign = await this.campaignsRepository.findOne({
      where: { id },
      relations: ['template', 'client', 'createdBy'],
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }
    return campaign;
  }

  /**
   * Получить детальную статистику по кампаниям
   */
  async getCampaignStats(filter: CampaignStatsFilterDto): Promise<CampaignStatsResponse> {
    const queryBuilder = this.campaignsRepository.createQueryBuilder('campaign');

    // Применяем фильтры
    if (filter.templateId) {
      queryBuilder.andWhere('campaign.templateId = :templateId', { templateId: filter.templateId });
    }

    if (filter.createdById) {
      queryBuilder.andWhere('campaign.createdById = :createdById', { createdById: filter.createdById });
    }

    if (filter.startDate) {
      queryBuilder.andWhere('campaign.createdAt >= :startDate', { startDate: filter.startDate });
    }

    if (filter.endDate) {
      queryBuilder.andWhere('campaign.createdAt <= :endDate', { endDate: filter.endDate });
    }

    // Загружаем все кампании с нужными связями
    const campaigns = await queryBuilder
      .leftJoinAndSelect('campaign.template', 'template')
      .leftJoinAndSelect('campaign.createdBy', 'createdBy')
      .getMany();

    // Подсчитываем общую статистику
    const total = campaigns.length;
    const pending = campaigns.filter((c) => c.status === WABACampaignStatus.PENDING).length;
    const scheduled = campaigns.filter((c) => c.status === WABACampaignStatus.SCHEDULED).length;
    const sent = campaigns.filter((c) => c.status === WABACampaignStatus.SENT).length;
    const delivered = campaigns.filter((c) => c.status === WABACampaignStatus.DELIVERED).length;
    const read = campaigns.filter((c) => c.status === WABACampaignStatus.READ).length;
    const failed = campaigns.filter((c) => c.status === WABACampaignStatus.FAILED).length;

    // Вычисляем проценты
    const deliveryRate = sent > 0 ? (delivered / sent) * 100 : 0;
    const readRate = delivered > 0 ? (read / delivered) * 100 : 0;
    const failureRate = total > 0 ? (failed / total) * 100 : 0;

    // Статистика по шаблонам
    const templateMap = new Map<string, any>();
    campaigns.forEach((campaign) => {
      const templateId = campaign.templateId;
      if (!templateMap.has(templateId)) {
        templateMap.set(templateId, {
          templateId,
          templateName: campaign.template?.name || 'Unknown',
          total: 0,
          sent: 0,
          delivered: 0,
          read: 0,
          failed: 0,
        });
      }
      const stats = templateMap.get(templateId);
      stats.total++;
      if (campaign.status === WABACampaignStatus.SENT) stats.sent++;
      if (campaign.status === WABACampaignStatus.DELIVERED) stats.delivered++;
      if (campaign.status === WABACampaignStatus.READ) stats.read++;
      if (campaign.status === WABACampaignStatus.FAILED) stats.failed++;
    });
    const byTemplate = Array.from(templateMap.values());

    // Статистика по датам
    const dateMap = new Map<string, any>();
    campaigns.forEach((campaign) => {
      const date = campaign.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          total: 0,
          sent: 0,
          delivered: 0,
          read: 0,
          failed: 0,
        });
      }
      const stats = dateMap.get(date);
      stats.total++;
      if (campaign.status === WABACampaignStatus.SENT) stats.sent++;
      if (campaign.status === WABACampaignStatus.DELIVERED) stats.delivered++;
      if (campaign.status === WABACampaignStatus.READ) stats.read++;
      if (campaign.status === WABACampaignStatus.FAILED) stats.failed++;
    });
    const byDate = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Статистика по создателям
    const creatorMap = new Map<string, any>();
    campaigns.forEach((campaign) => {
      if (!campaign.createdById) return;
      const creatorId = campaign.createdById;
      if (!creatorMap.has(creatorId)) {
        creatorMap.set(creatorId, {
          creatorId,
          creatorEmail: campaign.createdBy?.email || 'Unknown',
          total: 0,
          sent: 0,
          delivered: 0,
          read: 0,
          failed: 0,
        });
      }
      const stats = creatorMap.get(creatorId);
      stats.total++;
      if (campaign.status === WABACampaignStatus.SENT) stats.sent++;
      if (campaign.status === WABACampaignStatus.DELIVERED) stats.delivered++;
      if (campaign.status === WABACampaignStatus.READ) stats.read++;
      if (campaign.status === WABACampaignStatus.FAILED) stats.failed++;
    });
    const byCreator = Array.from(creatorMap.values());

    return {
      total,
      pending,
      scheduled,
      sent,
      delivered,
      read,
      failed,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      readRate: Math.round(readRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      byTemplate,
      byDate,
      byCreator,
    };
  }

  /**
   * Сохранить credentials
   */
  async saveCredentials(dto: CreateWABACredentialsDto): Promise<WABACredentials> {
    // Деактивируем старые credentials
    await this.credentialsRepository.update({ isActive: true }, { isActive: false });

    const credentials = this.credentialsRepository.create({
      ...dto,
      accessToken: this.encrypt(dto.accessToken),
      appSecret: dto.appSecret ? this.encrypt(dto.appSecret) : null,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      autoPauseThreshold: dto.autoPauseThreshold ?? 0,
    });

    const saved = await this.credentialsRepository.save(credentials);
    
    // Проверяем баланс при сохранении
    await this.checkBalance();
    
    this.logger.log('✅ WABA credentials saved');

    return saved;
  }

  /**
   * Обновить credentials
   */
  async updateCredentials(id: string, dto: UpdateWABACredentialsDto): Promise<WABACredentials> {
    const credentials = await this.credentialsRepository.findOne({ where: { id } });
    if (!credentials) {
      throw new NotFoundException(`Credentials with ID ${id} not found`);
    }

    if (dto.accessToken) {
      dto.accessToken = this.encrypt(dto.accessToken);
    }
    if (dto.appSecret) {
      dto.appSecret = this.encrypt(dto.appSecret);
    }

    Object.assign(credentials, dto);

    const updated = await this.credentialsRepository.save(credentials);
    this.logger.log('✅ WABA credentials updated');

    return updated;
  }

  /**
   * Получить credentials (без расшифровки токенов)
   */
  async getCredentials(): Promise<WABACredentials | null> {
    return this.credentialsRepository.findOne({
      where: { isActive: true },
    });
  }

  /**
   * Получить статистику использования токенов AI
   */
  async getAITokenStats(): Promise<{ used: number; limit: number; percentage: number }> {
    try {
      const stats = await this.aiService.getStats();
      const totalTokens = stats.totalTokens || 0;
      const limit = 1000000; // 1M токенов (можно настроить)
      const percentage = limit > 0 ? (totalTokens / limit) * 100 : 0;

      return {
        used: totalTokens,
        limit,
        percentage: Math.min(percentage, 100),
      };
    } catch (error) {
      this.logger.error('Failed to get AI token stats:', error);
      return {
        used: 0,
        limit: 1000000,
        percentage: 0,
      };
    }
  }
}

