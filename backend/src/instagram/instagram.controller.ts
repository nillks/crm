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
    this.logger.log('Received webhook from Instagram/Chatrace');
    
    try {
      await this.instagramService.handleWebhook(body);
      return { success: true };
    } catch (error) {
      this.logger.error('Error handling webhook:', error);
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
}

