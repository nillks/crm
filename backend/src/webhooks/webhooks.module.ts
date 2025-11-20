import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { Ticket } from '../entities/ticket.entity';
import { Client } from '../entities/client.entity';
import { User } from '../entities/user.entity';
import { TicketsModule } from '../tickets/tickets.module';
import { ClientsModule } from '../clients/clients.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, Client, User]),
    TicketsModule,
    ClientsModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}

