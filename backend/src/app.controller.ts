import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello() {
    return {
      message: 'CRM Backend API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/api/health',
        auth: {
          register: '/api/auth/register',
          login: '/api/auth/login',
          refresh: '/api/auth/refresh',
          me: '/api/auth/me',
        },
        clients: '/api/clients',
        tickets: '/api/tickets',
        roles: '/api/roles',
        whatsapp: {
          webhook: '/api/whatsapp/webhook',
          send: '/api/whatsapp/send',
          stats: '/api/whatsapp/stats',
        },
        telegram: {
          send: '/api/telegram/send',
        },
        instagram: {
          webhook: '/api/instagram/webhook',
          send: '/api/instagram/send',
          stats: '/api/instagram/stats',
        },
      },
      documentation: 'All API endpoints are under /api prefix',
    };
  }
}
