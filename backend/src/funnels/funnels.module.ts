import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FunnelsController } from './funnels.controller';
import { FunnelsService } from './funnels.service';
import { Funnel } from '../entities/funnel.entity';
import { FunnelStage } from '../entities/funnel-stage.entity';
import { Ticket } from '../entities/ticket.entity';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Funnel, FunnelStage, Ticket]),
    RolesModule,
  ],
  controllers: [FunnelsController],
  providers: [FunnelsService],
  exports: [FunnelsService],
})
export class FunnelsModule {}

