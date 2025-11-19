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
import { CreateWABACredentialsDto, UpdateWABACredentialsDto } from './dto/waba-credentials.dto';
import { AIService } from '../ai/ai.service';
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
    });

    const saved = await this.credentialsRepository.save(credentials);
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

