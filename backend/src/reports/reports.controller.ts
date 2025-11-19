import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import * as fs from 'fs';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Сгенерировать отчёт
   * POST /reports/generate
   */
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generateReport(@Body() dto: GenerateReportDto) {
    const result = await this.reportsService.generateReport(dto);
    return {
      success: true,
      fileName: result.fileName,
      downloadUrl: `/api/reports/download/${result.fileName}`,
    };
  }

  /**
   * Скачать отчёт
   * GET /reports/download/:fileName
   */
  @Get('download/:fileName')
  async downloadReport(@Param('fileName') fileName: string, @Res() res: Response) {
    try {
      const filePath = await this.reportsService.getReportFile(fileName);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.sendFile(filePath);
    } catch (error: any) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: error.message || 'Report file not found',
      });
    }
  }

  /**
   * Генерация отчёта по тикетам
   * GET /reports/tickets?startDate=...&endDate=...&format=excel
   */
  @Get('tickets')
  async getTicketsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    const result = await this.reportsService.generateReport({
      type: 'tickets' as any,
      format: 'excel' as any,
      startDate,
      endDate,
    });

    if (res) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`);
      res.sendFile(result.filePath);
    }

    return {
      success: true,
      fileName: result.fileName,
      downloadUrl: `/api/reports/download/${result.fileName}`,
    };
  }

  /**
   * Генерация отчёта по звонкам
   * GET /reports/calls?startDate=...&endDate=...&format=excel
   */
  @Get('calls')
  async getCallsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    const result = await this.reportsService.generateReport({
      type: 'calls' as any,
      format: 'excel' as any,
      startDate,
      endDate,
    });

    if (res) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`);
      res.sendFile(result.filePath);
    }

    return {
      success: true,
      fileName: result.fileName,
      downloadUrl: `/api/reports/download/${result.fileName}`,
    };
  }

  /**
   * Генерация отчёта по операторам
   * GET /reports/operators?startDate=...&endDate=...&format=excel
   */
  @Get('operators')
  async getOperatorsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    const result = await this.reportsService.generateReport({
      type: 'operators' as any,
      format: 'excel' as any,
      startDate,
      endDate,
    });

    if (res) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`);
      res.sendFile(result.filePath);
    }

    return {
      success: true,
      fileName: result.fileName,
      downloadUrl: `/api/reports/download/${result.fileName}`,
    };
  }

  /**
   * Генерация отчёта по клиентам
   * GET /reports/clients?startDate=...&endDate=...&format=excel
   */
  @Get('clients')
  async getClientsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    const result = await this.reportsService.generateReport({
      type: 'clients' as any,
      format: 'excel' as any,
      startDate,
      endDate,
    });

    if (res) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.fileName)}"`);
      res.sendFile(result.filePath);
    }

    return {
      success: true,
      fileName: result.fileName,
      downloadUrl: `/api/reports/download/${result.fileName}`,
    };
  }
}

