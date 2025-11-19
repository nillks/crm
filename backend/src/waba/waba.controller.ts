import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WABAService } from './waba.service';
import { CreateWABATemplateDto } from './dto/create-waba-template.dto';
import { UpdateWABATemplateDto } from './dto/update-waba-template.dto';
import { CreateWABACampaignDto } from './dto/create-waba-campaign.dto';
import { CreateWABACredentialsDto, UpdateWABACredentialsDto } from './dto/waba-credentials.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@Controller('waba')
@UseGuards(JwtAuthGuard)
export class WABAController {
  constructor(private readonly wabaService: WABAService) {}

  /**
   * Создать шаблон
   * POST /waba/templates
   */
  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(@Body() dto: CreateWABATemplateDto) {
    return this.wabaService.createTemplate(dto);
  }

  /**
   * Получить все шаблоны
   * GET /waba/templates
   */
  @Get('templates')
  async findAllTemplates() {
    return this.wabaService.findAllTemplates();
  }

  /**
   * Получить шаблон по ID
   * GET /waba/templates/:id
   */
  @Get('templates/:id')
  async findTemplateById(@Param('id') id: string) {
    return this.wabaService.findTemplateById(id);
  }

  /**
   * Обновить шаблон
   * PUT /waba/templates/:id
   */
  @Put('templates/:id')
  async updateTemplate(@Param('id') id: string, @Body() dto: UpdateWABATemplateDto) {
    return this.wabaService.updateTemplate(id, dto);
  }

  /**
   * Удалить шаблон
   * DELETE /waba/templates/:id
   */
  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(@Param('id') id: string) {
    await this.wabaService.deleteTemplate(id);
  }

  /**
   * Создать кампанию
   * POST /waba/campaigns
   */
  @Post('campaigns')
  @HttpCode(HttpStatus.CREATED)
  async createCampaign(@Body() dto: CreateWABACampaignDto, @GetUser() user: User) {
    return this.wabaService.createCampaign(dto, user.id);
  }

  /**
   * Получить все кампании
   * GET /waba/campaigns
   */
  @Get('campaigns')
  async findAllCampaigns() {
    return this.wabaService.findAllCampaigns();
  }

  /**
   * Получить кампанию по ID
   * GET /waba/campaigns/:id
   */
  @Get('campaigns/:id')
  async findCampaignById(@Param('id') id: string) {
    return this.wabaService.findCampaignById(id);
  }

  /**
   * Отправить кампанию
   * POST /waba/campaigns/:id/send
   */
  @Post('campaigns/:id/send')
  async sendCampaign(@Param('id') id: string) {
    await this.wabaService.sendCampaign(id);
    return { message: 'Campaign sent successfully' };
  }

  /**
   * Сохранить credentials
   * POST /waba/credentials
   */
  @Post('credentials')
  @HttpCode(HttpStatus.CREATED)
  async saveCredentials(@Body() dto: CreateWABACredentialsDto) {
    return this.wabaService.saveCredentials(dto);
  }

  /**
   * Обновить credentials
   * PUT /waba/credentials/:id
   */
  @Put('credentials/:id')
  async updateCredentials(@Param('id') id: string, @Body() dto: UpdateWABACredentialsDto) {
    return this.wabaService.updateCredentials(id, dto);
  }

  /**
   * Получить credentials
   * GET /waba/credentials
   */
  @Get('credentials')
  async getCredentials() {
    return this.wabaService.getCredentials();
  }

  /**
   * Получить статистику токенов AI
   * GET /waba/ai-token-stats
   */
  @Get('ai-token-stats')
  async getAITokenStats() {
    return this.wabaService.getAITokenStats();
  }
}

