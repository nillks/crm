import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { Client } from '../entities/client.entity';
import { ClientComment } from '../entities/client-comment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Client, ClientComment])],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}

