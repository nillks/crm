import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ScheduledReportsService } from './scheduled-reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';
import { CreateScheduledReportDto, UpdateScheduledReportDto } from './dto/create-scheduled-report.dto';

@Controller('scheduled-reports')
@UseGuards(JwtAuthGuard)
export class ScheduledReportsController {
  constructor(private readonly scheduledReportsService: ScheduledReportsService) {}

  @Post()
  create(@Body() createDto: CreateScheduledReportDto, @GetUser() user: User) {
    return this.scheduledReportsService.create(createDto, user.id);
  }

  @Get()
  findAll(@GetUser() user: User) {
    return this.scheduledReportsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.scheduledReportsService.findOne(id, user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateScheduledReportDto, @GetUser() user: User) {
    return this.scheduledReportsService.update(id, updateDto, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.scheduledReportsService.remove(id, user.id);
  }
}

