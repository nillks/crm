import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { Message } from '../entities/message.entity';
import { Client } from '../entities/client.entity';
import { Ticket } from '../entities/ticket.entity';
import { User } from '../entities/user.entity';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, Client, Ticket, User]),
    AIModule,
  ],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}

