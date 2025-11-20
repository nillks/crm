import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportLinesController } from './support-lines.controller';
import { SupportLinesService } from './support-lines.service';
import { SupportLine } from '../entities/support-line.entity';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SupportLine, User, Role])],
  controllers: [SupportLinesController],
  providers: [SupportLinesService],
  exports: [SupportLinesService],
})
export class SupportLinesModule {}

