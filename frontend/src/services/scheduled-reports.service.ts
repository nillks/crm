import api from './api';

export enum ScheduleFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

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

export interface ScheduledReport {
  id: string;
  userId: string;
  name: string;
  reportType: ReportType;
  format: ReportFormat;
  frequency: ScheduleFrequency;
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  telegramChatId?: string;
  email?: string;
  fields?: string[];
  filters?: {
    startDate?: string;
    endDate?: string;
    [key: string]: any;
  };
  isActive: boolean;
  nextRunAt?: string;
  lastRunAt?: string;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduledReportDto {
  name: string;
  reportType: ReportType;
  format: ReportFormat;
  frequency: ScheduleFrequency;
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  telegramChatId?: string;
  email?: string;
  fields?: string[];
  filters?: {
    startDate?: string;
    endDate?: string;
    [key: string]: any;
  };
  isActive?: boolean;
}

export interface UpdateScheduledReportDto {
  name?: string;
  reportType?: ReportType;
  format?: ReportFormat;
  frequency?: ScheduleFrequency;
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  telegramChatId?: string;
  email?: string;
  fields?: string[];
  filters?: {
    startDate?: string;
    endDate?: string;
    [key: string]: any;
  };
  isActive?: boolean;
}

class ScheduledReportsService {
  /**
   * Создать расписание отчёта
   */
  async create(dto: CreateScheduledReportDto): Promise<ScheduledReport> {
    const response = await api.post<ScheduledReport>('/scheduled-reports', dto);
    return response.data;
  }

  /**
   * Получить все расписания
   */
  async findAll(): Promise<ScheduledReport[]> {
    const response = await api.get<ScheduledReport[]>('/scheduled-reports');
    return response.data;
  }

  /**
   * Получить расписание по ID
   */
  async findOne(id: string): Promise<ScheduledReport> {
    const response = await api.get<ScheduledReport>(`/scheduled-reports/${id}`);
    return response.data;
  }

  /**
   * Обновить расписание
   */
  async update(id: string, dto: UpdateScheduledReportDto): Promise<ScheduledReport> {
    const response = await api.put<ScheduledReport>(`/scheduled-reports/${id}`, dto);
    return response.data;
  }

  /**
   * Удалить расписание
   */
  async remove(id: string): Promise<void> {
    await api.delete(`/scheduled-reports/${id}`);
  }
}

export const scheduledReportsService = new ScheduledReportsService();

