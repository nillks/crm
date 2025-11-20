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
import { SupportLinesService } from './support-lines.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../roles/guards/permissions.guard';
import { RequirePermissions } from '../roles/decorators/require-permissions.decorator';
import { Action, Subject } from '../roles/abilities.definition';
import { CreateSupportLineDto, UpdateSupportLineDto } from './dto/create-support-line.dto';

@Controller('support-lines')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SupportLinesController {
  constructor(private readonly supportLinesService: SupportLinesService) {}

  @Post()
  @RequirePermissions({ action: Action.Create, subject: Subject.SupportLine })
  create(@Body() createDto: CreateSupportLineDto) {
    return this.supportLinesService.create(createDto);
  }

  @Get()
  @RequirePermissions({ action: Action.Read, subject: Subject.SupportLine })
  findAll() {
    return this.supportLinesService.findAll();
  }

  @Get(':id')
  @RequirePermissions({ action: Action.Read, subject: Subject.SupportLine })
  findOne(@Param('id') id: string) {
    return this.supportLinesService.findOne(id);
  }

  @Put(':id')
  @RequirePermissions({ action: Action.Update, subject: Subject.SupportLine })
  update(@Param('id') id: string, @Body() updateDto: UpdateSupportLineDto) {
    return this.supportLinesService.update(id, updateDto);
  }

  @Delete(':id')
  @RequirePermissions({ action: Action.Delete, subject: Subject.SupportLine })
  remove(@Param('id') id: string) {
    return this.supportLinesService.remove(id);
  }

  @Post(':id/operators/:userId')
  @RequirePermissions({ action: Action.Update, subject: Subject.SupportLine })
  assignOperator(@Param('id') lineId: string, @Param('userId') userId: string) {
    return this.supportLinesService.assignOperator(lineId, userId);
  }

  @Delete('operators/:userId')
  @RequirePermissions({ action: Action.Update, subject: Subject.SupportLine })
  unassignOperator(@Param('userId') userId: string) {
    return this.supportLinesService.unassignOperator(userId);
  }
}

