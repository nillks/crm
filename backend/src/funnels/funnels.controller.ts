import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { FunnelsService } from './funnels.service';
import { CreateFunnelDto } from './dto/create-funnel.dto';
import { UpdateFunnelDto } from './dto/update-funnel.dto';
import { CreateFunnelStageDto } from './dto/create-funnel-stage.dto';
import { UpdateFunnelStageDto } from './dto/update-funnel-stage.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('funnels')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FunnelsController {
  constructor(private readonly funnelsService: FunnelsService) {}

  @Get()
  @Roles('admin', 'operator1', 'operator2', 'operator3')
  findAll() {
    return this.funnelsService.findAll();
  }

  @Get('active')
  @Roles('admin', 'operator1', 'operator2', 'operator3')
  findActive() {
    return this.funnelsService.findActive();
  }

  @Get(':id')
  @Roles('admin', 'operator1', 'operator2', 'operator3')
  findOne(@Param('id') id: string) {
    return this.funnelsService.findOne(id);
  }

  @Post()
  @Roles('admin')
  create(@Body() createDto: CreateFunnelDto) {
    return this.funnelsService.create(createDto);
  }

  @Patch(':id')
  @Roles('admin')
  update(@Param('id') id: string, @Body() updateDto: UpdateFunnelDto) {
    return this.funnelsService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.funnelsService.remove(id);
  }

  @Get(':funnelId/stages')
  @Roles('admin', 'operator1', 'operator2', 'operator3')
  findStagesByFunnel(@Param('funnelId') funnelId: string) {
    return this.funnelsService.findStagesByFunnel(funnelId);
  }

  @Post('stages')
  @Roles('admin')
  createStage(@Body() createDto: CreateFunnelStageDto) {
    return this.funnelsService.createStage(createDto);
  }

  @Patch('stages/:id')
  @Roles('admin')
  updateStage(@Param('id') id: string, @Body() updateDto: UpdateFunnelStageDto) {
    return this.funnelsService.updateStage(id, updateDto);
  }

  @Delete('stages/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeStage(@Param('id') id: string) {
    return this.funnelsService.removeStage(id);
  }

  @Get(':id/stats')
  @Roles('admin', 'operator1', 'operator2', 'operator3')
  getFunnelStats(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.funnelsService.getFunnelStats(id, start, end);
  }
}

