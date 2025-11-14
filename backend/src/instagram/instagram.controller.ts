import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { InstagramService } from './instagram.service';
import { SendInstagramMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../roles/guards/permissions.guard';
import { RequirePermissions } from '../roles/decorators/require-permissions.decorator';
import { Action, Subject } from '../roles/abilities.definition';
import { Public } from '../auth/decorators/public.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@Controller('instagram')
export class InstagramController {
  private readonly logger = new Logger(InstagramController.name);

  constructor(private readonly instagramService: InstagramService) {}

  /**
   * Webhook для приёма сообщений от Instagram (или мок-данных)
   * Публичный endpoint, не требует авторизации
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any) {
    this.logger.log('═══════════════════════════════════════════════════════');
    this.logger.log('📨 Received webhook from Instagram/Chatrace');
    this.logger.log(`📅 Time: ${new Date().toISOString()}`);
    this.logger.log(`📦 Body type: ${typeof body}`);
    this.logger.log(`📦 Body keys: ${Object.keys(body || {}).join(', ')}`);
    this.logger.log(`📦 Full body: ${JSON.stringify(body, null, 2)}`);
    this.logger.log('═══════════════════════════════════════════════════════');
    
    try {
      await this.instagramService.handleWebhook(body);
      this.logger.log('✅ Webhook processed successfully');
      return { success: true };
    } catch (error) {
      this.logger.error('❌ Error handling webhook:', error);
      this.logger.error(`❌ Error stack: ${error.stack}`);
      // Всегда возвращаем 200, чтобы не повторяли запрос
      return { success: false, error: error.message };
    }
  }

  /**
   * Отправить сообщение через Instagram
   * Требуется право: create Message
   */
  @Post('send')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions({ action: Action.Create, subject: Subject.Message })
  @HttpCode(HttpStatus.OK)
  async sendMessage(@Body() sendMessageDto: SendInstagramMessageDto, @GetUser() user: User) {
    return this.instagramService.sendMessage(sendMessageDto, user);
  }

  /**
   * Проверить конфигурацию Instagram
   * Требуется право: read Message
   */
  @Get('config')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions({ action: Action.Read, subject: Subject.Message })
  getConfig() {
    return this.instagramService.getConfig();
  }

  /**
   * Ручная проверка новых сообщений (для тестирования)
   * Требуется право: read Message
   */
  @Get('check-messages')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions({ action: Action.Read, subject: Subject.Message })
  async checkMessages() {
    this.logger.log('🔍 Manual Instagram message check requested');
    try {
      await this.instagramService.checkForNewMessages();
      return { success: true, message: 'Message check completed' };
    } catch (error) {
      this.logger.error('Error in manual Instagram message check:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Получить статистику Instagram сообщений (для диагностики)
   * Требуется право: read Message
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions({ action: Action.Read, subject: Subject.Message })
  async getStats() {
    return this.instagramService.getStats();
  }
}

