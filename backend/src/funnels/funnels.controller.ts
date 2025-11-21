import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FunnelsService } from './funnels.service';
import { CreateFunnelDto, UpdateFunnelDto, CreateFunnelStageDto, UpdateFunnelStageDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../roles/guards/permissions.guard';
import { RequirePermissions } from '../roles/decorators/require-permissions.decorator';
import { Action, Subject } from '../roles/abilities.definition';

@Controller('funnels')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FunnelsController {
  constructor(private readonly funnelsService: FunnelsService) {}

  /**
   * Получить все воронки
   * GET /funnels
   */
  @Get()
  @RequirePermissions({ action: Action.Read, subject: Subject.Ticket })
  async findAll() {
    return this.funnelsService.findAll();
  }

  /**
   * Получить активные воронки
   * GET /funnels/active
   */
  @Get('active')
  @RequirePermissions({ action: Action.Read, subject: Subject.Ticket })
  async findActive() {
    return this.funnelsService.findActive();
  }

  /**
   * Получить воронку по ID
   * GET /funnels/:id
   */
  @Get(':id')
  @RequirePermissions({ action: Action.Read, subject: Subject.Ticket })
  async findOne(@Param('id') id: string) {
    return this.funnelsService.findOne(id);
  }

  /**
   * Создать воронку
   * POST /funnels
   */
  @Post()
  @RequirePermissions({ action: Action.Create, subject: Subject.Ticket })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createFunnelDto: CreateFunnelDto) {
    return this.funnelsService.create(createFunnelDto);
  }

  /**
   * Обновить воронку
   * PATCH /funnels/:id
   */
  @Patch(':id')
  @RequirePermissions({ action: Action.Update, subject: Subject.Ticket })
  async update(@Param('id') id: string, @Body() updateFunnelDto: UpdateFunnelDto) {
    return this.funnelsService.update(id, updateFunnelDto);
  }

  /**
   * Удалить воронку
   * DELETE /funnels/:id
   */
  @Delete(':id')
  @RequirePermissions({ action: Action.Delete, subject: Subject.Ticket })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.funnelsService.remove(id);
  }

  /**
   * Получить этапы воронки
   * GET /funnels/:funnelId/stages
   */
  @Get(':funnelId/stages')
  @RequirePermissions({ action: Action.Read, subject: Subject.Ticket })
  async findStagesByFunnel(@Param('funnelId') funnelId: string) {
    return this.funnelsService.findStagesByFunnel(funnelId);
  }

  /**
   * Создать этап воронки
   * POST /funnels/stages
   */
  @Post('stages')
  @RequirePermissions({ action: Action.Create, subject: Subject.Ticket })
  @HttpCode(HttpStatus.CREATED)
  async createStage(@Body() createStageDto: CreateFunnelStageDto) {
    return this.funnelsService.createStage(createStageDto);
  }

  /**
   * Обновить этап воронки
   * PATCH /funnels/stages/:id
   */
  @Patch('stages/:id')
  @RequirePermissions({ action: Action.Update, subject: Subject.Ticket })
  async updateStage(@Param('id') id: string, @Body() updateStageDto: UpdateFunnelStageDto) {
    return this.funnelsService.updateStage(id, updateStageDto);
  }

  /**
   * Удалить этап воронки
   * DELETE /funnels/stages/:id
   */
  @Delete('stages/:id')
  @RequirePermissions({ action: Action.Delete, subject: Subject.Ticket })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeStage(@Param('id') id: string) {
    await this.funnelsService.removeStage(id);
  }

  /**
   * Получить статистику по воронке
   * GET /funnels/:funnelId/stats
   */
  @Get(':funnelId/stats')
  @RequirePermissions({ action: Action.Read, subject: Subject.Ticket })
  async getFunnelStats(
    @Param('funnelId') funnelId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.funnelsService.getFunnelStats(funnelId, startDate, endDate);
  }
}

