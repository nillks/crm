import { IsEnum, IsOptional, IsDateString, IsString } from 'class-validator';

export enum ReportType {
  TICKETS = 'tickets',
  CALLS = 'calls',
  OPERATORS = 'operators',
  CLIENTS = 'clients',
}

export enum ReportFormat {
  EXCEL = 'excel',
  PDF = 'pdf',
}

export class GenerateReportDto {
  @IsEnum(ReportType)
  type: ReportType;

  @IsEnum(ReportFormat)
  format: ReportFormat;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  telegramChatId?: string; // Для отправки отчёта в Telegram
}

