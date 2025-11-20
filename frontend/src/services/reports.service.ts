import api from './api';

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

export interface GenerateReportDto {
  type: ReportType;
  format: ReportFormat;
  startDate?: string;
  endDate?: string;
  telegramChatId?: string;
  fields?: string[]; // Выбранные поля для отчёта
}

export interface GenerateReportResponse {
  success: boolean;
  fileName: string;
  downloadUrl: string;
}

class ReportsService {
  /**
   * Сгенерировать отчёт
   */
  async generateReport(dto: GenerateReportDto): Promise<GenerateReportResponse> {
    const response = await api.post<GenerateReportResponse>('/reports/generate', dto);
    return response.data;
  }

  /**
   * Скачать отчёт
   */
  async downloadReport(fileName: string): Promise<Blob> {
    const response = await api.get(`/reports/download/${fileName}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Получить URL для скачивания отчёта
   */
  getDownloadUrl(fileName: string): string {
    return `${api.defaults.baseURL}/reports/download/${fileName}`;
  }

  /**
   * Генерация отчёта по тикетам
   */
  async getTicketsReport(startDate?: string, endDate?: string): Promise<GenerateReportResponse> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get<GenerateReportResponse>(
      `/reports/tickets${params.toString() ? `?${params.toString()}` : ''}`,
    );
    return response.data;
  }

  /**
   * Генерация отчёта по звонкам
   */
  async getCallsReport(startDate?: string, endDate?: string): Promise<GenerateReportResponse> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get<GenerateReportResponse>(
      `/reports/calls${params.toString() ? `?${params.toString()}` : ''}`,
    );
    return response.data;
  }

  /**
   * Генерация отчёта по операторам
   */
  async getOperatorsReport(startDate?: string, endDate?: string): Promise<GenerateReportResponse> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get<GenerateReportResponse>(
      `/reports/operators${params.toString() ? `?${params.toString()}` : ''}`,
    );
    return response.data;
  }

  /**
   * Генерация отчёта по клиентам
   */
  async getClientsReport(startDate?: string, endDate?: string): Promise<GenerateReportResponse> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get<GenerateReportResponse>(
      `/reports/clients${params.toString() ? `?${params.toString()}` : ''}`,
    );
    return response.data;
  }
}

export const reportsService = new ReportsService();

