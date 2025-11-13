import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { SendTelegramMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../roles/guards/permissions.guard';
import { RequirePermissions } from '../roles/decorators/require-permissions.decorator';
import { Action, Subject } from '../roles/abilities.definition';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  /**
   * Отправить сообщение через Telegram
   * Требуется право: create Message
   */
  @Post('send')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions({ action: Action.Create, subject: Subject.Message })
  @HttpCode(HttpStatus.OK)
  async sendMessage(@Body() sendMessageDto: SendTelegramMessageDto, @GetUser() user: User) {
    return this.telegramService.sendMessage(sendMessageDto, user);
  }

  /**
   * Проверить конфигурацию Telegram
   * Требуется право: read Message
   */
  @Get('config')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions({ action: Action.Read, subject: Subject.Message })
  getConfig() {
    return this.telegramService.getConfig();
  }
}

