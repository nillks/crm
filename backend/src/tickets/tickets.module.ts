import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { Ticket } from '../entities/ticket.entity';
import { Comment } from '../entities/comment.entity';
import { TransferHistory } from '../entities/transfer-history.entity';
import { User } from '../entities/user.entity';
import { FunnelStage } from '../entities/funnel-stage.entity';
import { SupportLine } from '../entities/support-line.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Comment, TransferHistory, User, FunnelStage, SupportLine]),
    UsersModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}

