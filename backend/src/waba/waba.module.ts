import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WABAController } from './waba.controller';
import { WABAService } from './waba.service';
import { WABATemplate } from '../entities/waba-template.entity';
import { WABACampaign } from '../entities/waba-campaign.entity';
import { WABACredentials } from '../entities/waba-credentials.entity';
import { Client } from '../entities/client.entity';
import { User } from '../entities/user.entity';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    TypeOrmModule.forFeature([WABATemplate, WABACampaign, WABACredentials, Client, User]),
    AIModule,
  ],
  controllers: [WABAController],
  providers: [WABAService],
  exports: [WABAService],
})
export class WABAModule {}

