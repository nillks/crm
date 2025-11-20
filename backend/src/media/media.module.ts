import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaFile } from '../entities/media-file.entity';
import { Client } from '../entities/client.entity';
import { Message } from '../entities/message.entity';
import { Ticket } from '../entities/ticket.entity';
import { CallLog } from '../entities/call-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MediaFile, Client, Message, Ticket, CallLog])],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}

