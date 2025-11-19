import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { Message } from '../entities/message.entity';
import { Client } from '../entities/client.entity';
import { Ticket } from '../entities/ticket.entity';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forFeature([Message, Client, Ticket, User]),
    AIModule,
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}

