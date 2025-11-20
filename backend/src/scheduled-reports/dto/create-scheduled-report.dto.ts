import { IsString, IsEnum, IsOptional, IsBoolean, IsInt, Min, Max, IsEmail, IsArray, IsObject } from 'class-validator';
import { ScheduleFrequency, ReportType, ReportFormat } from '../../entities/scheduled-report.entity';

export class CreateScheduledReportDto {
  @IsString()
  name: string;

  @IsEnum(ReportType)
  reportType: ReportType;

  @IsEnum(ReportFormat)
  format: ReportFormat;

  @IsEnum(ScheduleFrequency)
  frequency: ScheduleFrequency;

  @IsString()
  @IsOptional()
  time?: string; // Формат: "HH:mm"

  @IsInt()
  @Min(0)
  @Max(6)
  @IsOptional()
  dayOfWeek?: number; // 0 = воскресенье, 1 = понедельник, и т.д.

  @IsInt()
  @Min(1)
  @Max(31)
  @IsOptional()
  dayOfMonth?: number; // 1-31

  @IsString()
  @IsOptional()
  telegramChatId?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fields?: string[];

  @IsObject()
  @IsOptional()
  filters?: {
    startDate?: string;
    endDate?: string;
    [key: string]: any;
  };
}

export class UpdateScheduledReportDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(ReportType)
  @IsOptional()
  reportType?: ReportType;

  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;

  @IsEnum(ScheduleFrequency)
  @IsOptional()
  frequency?: ScheduleFrequency;

  @IsString()
  @IsOptional()
  time?: string;

  @IsInt()
  @Min(0)
  @Max(6)
  @IsOptional()
  dayOfWeek?: number;

  @IsInt()
  @Min(1)
  @Max(31)
  @IsOptional()
  dayOfMonth?: number;

  @IsString()
  @IsOptional()
  telegramChatId?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fields?: string[];

  @IsObject()
  @IsOptional()
  filters?: {
    startDate?: string;
    endDate?: string;
    [key: string]: any;
  };

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

