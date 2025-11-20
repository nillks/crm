import { IsEnum, IsOptional, IsDateString, IsString, IsArray } from 'class-validator';

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

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fields?: string[]; // Выбранные поля для отчёта
}

