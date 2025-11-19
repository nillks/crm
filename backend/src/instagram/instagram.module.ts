import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstagramService } from './instagram.service';
import { InstagramController } from './instagram.controller';
import { Message } from '../entities/message.entity';
import { Client } from '../entities/client.entity';
import { Ticket } from '../entities/ticket.entity';
import { User } from '../entities/user.entity';
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
  controllers: [InstagramController],
  providers: [InstagramService],
  exports: [InstagramService],
})
export class InstagramModule {}

