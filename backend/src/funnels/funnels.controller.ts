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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../roles/guards/roles.guard';
import { Roles } from '../roles/decorators/roles.decorator';
import { RoleName } from '../entities/role.entity';

@Controller('funnels')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FunnelsController {
  constructor(private readonly funnelsService: FunnelsService) {}

  @Get()
  @Roles(RoleName.ADMIN, RoleName.OPERATOR1, RoleName.OPERATOR2, RoleName.OPERATOR3)
  findAll() {
    return this.funnelsService.findAll();
  }

  @Get('active')
  @Roles(RoleName.ADMIN, RoleName.OPERATOR1, RoleName.OPERATOR2, RoleName.OPERATOR3)
  findActive() {
    return this.funnelsService.findActive();
  }

  @Get(':id')
  @Roles(RoleName.ADMIN, RoleName.OPERATOR1, RoleName.OPERATOR2, RoleName.OPERATOR3)
  findOne(@Param('id') id: string) {
    return this.funnelsService.findOne(id);
  }

  @Post()
  @Roles(RoleName.ADMIN)
  create(@Body() createDto: CreateFunnelDto) {
    return this.funnelsService.create(createDto);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN)
  update(@Param('id') id: string, @Body() updateDto: UpdateFunnelDto) {
    return this.funnelsService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.funnelsService.remove(id);
  }

  @Get(':funnelId/stages')
  @Roles(RoleName.ADMIN, RoleName.OPERATOR1, RoleName.OPERATOR2, RoleName.OPERATOR3)
  findStagesByFunnel(@Param('funnelId') funnelId: string) {
    return this.funnelsService.findStagesByFunnel(funnelId);
  }

  @Post('stages')
  @Roles(RoleName.ADMIN)
  createStage(@Body() createDto: CreateFunnelStageDto) {
    return this.funnelsService.createStage(createDto);
  }

  @Patch('stages/:id')
  @Roles(RoleName.ADMIN)
  updateStage(@Param('id') id: string, @Body() updateDto: UpdateFunnelStageDto) {
    return this.funnelsService.updateStage(id, updateDto);
  }

  @Delete('stages/:id')
  @Roles(RoleName.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeStage(@Param('id') id: string) {
    return this.funnelsService.removeStage(id);
  }

  @Get(':id/stats')
  @Roles(RoleName.ADMIN, RoleName.OPERATOR1, RoleName.OPERATOR2, RoleName.OPERATOR3)
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

