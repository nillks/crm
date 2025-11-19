import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { AiSetting } from '../entities/ai-setting.entity';
import { AiLog } from '../entities/ai-log.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([AiSetting, AiLog]),
  ],
  controllers: [AIController],
  providers: [AIService],
  exports: [AIService],
})
export class AIModule {}

