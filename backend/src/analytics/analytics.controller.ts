import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SLAMetricsDto } from './dto/sla-metrics.dto';
import { KPIMetricsDto } from './dto/kpi-metrics.dto';
import { ChannelAnalyticsDto } from './dto/channel-analytics.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Получить SLA метрики
   * GET /analytics/sla?startDate=2024-01-01&endDate=2024-01-31
   */
  @Get('sla')
  async getSLA(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<SLAMetricsDto> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.calculateSLA(start, end);
  }

  /**
   * Получить KPI метрики
   * GET /analytics/kpi?startDate=2024-01-01&endDate=2024-01-31
   */
  @Get('kpi')
  async getKPI(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<KPIMetricsDto> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.calculateKPI(start, end);
  }

  /**
   * Получить аналитику по каналам
   * GET /analytics/channels?startDate=2024-01-01&endDate=2024-01-31
   */
  @Get('channels')
  async getChannelAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<ChannelAnalyticsDto> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return this.analyticsService.getChannelAnalytics(start, end);
  }
}

