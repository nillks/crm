import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../roles/guards/permissions.guard';
import { RequirePermissions } from '../roles/decorators/require-permissions.decorator';
import { Action, Subject } from '../roles/abilities.definition';
import { Public } from '../auth/decorators/public.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(private readonly whatsappService: WhatsAppService) {}

  /**
   * Webhook для верификации (для совместимости, Green API не требует)
   * Публичный endpoint, не требует авторизации
   */
  @Public()
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    this.logger.log(`Webhook verification request (Green API does not require this)`);
    const result = this.whatsappService.verifyWebhook(mode, token, challenge);
    return result || HttpStatus.OK;
  }

  /**
   * Webhook для приёма сообщений от Green API
   * Публичный endpoint, не требует авторизации
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any) {
    this.logger.log('Received webhook from Green API');
    
    try {
      await this.whatsappService.handleWebhook(body);
      return { success: true };
    } catch (error) {
      this.logger.error('Error handling webhook:', error);
      // Всегда возвращаем 200, чтобы Green API не повторял запрос
      return { success: false, error: error.message };
    }
  }

  /**
   * Отправить сообщение через WhatsApp
   * Требуется право: create Message
   */
  @Post('send')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions({ action: Action.Create, subject: Subject.Message })
  @HttpCode(HttpStatus.OK)
  async sendMessage(@Body() sendMessageDto: SendMessageDto, @GetUser() user: User) {
    return this.whatsappService.sendMessage(sendMessageDto, user);
  }

  /**
   * Проверить конфигурацию WhatsApp
   * Требуется право: read Message (для проверки настроек)
   */
  @Get('config')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions({ action: Action.Read, subject: Subject.Message })
  getConfig() {
    return this.whatsappService.getConfig();
  }
}

