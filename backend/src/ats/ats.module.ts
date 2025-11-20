import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ATSController } from './ats.controller';
import { ATSService } from './ats.service';
import { Call } from '../entities/call.entity';
import { CallLog } from '../entities/call-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Call, CallLog])],
  controllers: [ATSController],
  providers: [ATSService],
  exports: [ATSService],
})
export class ATSModule {}