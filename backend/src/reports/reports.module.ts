import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Ticket } from '../entities/ticket.entity';
import { Call } from '../entities/call.entity';
import { Client } from '../entities/client.entity';
import { User } from '../entities/user.entity';
import { Message } from '../entities/message.entity';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forFeature([Ticket, Call, Client, User, Message]),
    TelegramModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

