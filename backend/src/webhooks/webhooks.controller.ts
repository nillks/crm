import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { Public } from '../auth/decorators/public.decorator';
import { ContactFormData } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * Webhook для приема данных из форм обратной связи с сайта
   * POST /webhooks/contact-form
   * Публичный endpoint, не требует авторизации
   */
  @Public()
  @Post('contact-form')
  @HttpCode(HttpStatus.CREATED)
  async handleContactForm(@Body() data: ContactFormData) {
    return this.webhooksService.handleContactForm(data);
  }
}

