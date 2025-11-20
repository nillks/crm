import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FunnelsService } from './funnels.service';
import { FunnelsController } from './funnels.controller';
import { Funnel } from '../entities/funnel.entity';
import { FunnelStage } from '../entities/funnel-stage.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Funnel, FunnelStage])],
  controllers: [FunnelsController],
  providers: [FunnelsService],
  exports: [FunnelsService],
})
export class FunnelsModule {}

