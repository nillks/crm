import api from './api';

export interface SLAMetrics {
  averageResolutionTime: number;
  medianResolutionTime: number;
  onTimeClosureRate: number;
  totalClosedTickets: number;
  onTimeClosedTickets: number;
  averageResponseTime: number;
  medianResponseTime: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface KPIMetrics {
  missedCalls: number;
  unreadMessages: number;
  overdueTasks: number;
  activeTickets: number;
  newTickets: number;
  inProgressTickets: number;
  overdueTickets: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface ChannelAnalytics {
  channels: {
    channel: string;
    totalTickets: number;
    closedTickets: number;
    averageResolutionTime: number;
    averageResponseTime: number;
    totalMessages: number;
    unreadMessages: number;
  }[];
  summary: {
    totalTickets: number;
    totalMessages: number;
    totalUnreadMessages: number;
    averageResolutionTime: number;
    averageResponseTime: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

class AnalyticsService {
  /**
   * Получить SLA метрики
   */
  async getSLA(startDate?: string, endDate?: string): Promise<SLAMetrics> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get<SLAMetrics>(`/analytics/sla?${params.toString()}`);
    return response.data;
  }

  /**
   * Получить KPI метрики
   */
  async getKPI(startDate?: string, endDate?: string): Promise<KPIMetrics> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get<KPIMetrics>(`/analytics/kpi?${params.toString()}`);
    return response.data;
  }

  /**
   * Получить аналитику по каналам
   */
  async getChannelAnalytics(startDate?: string, endDate?: string): Promise<ChannelAnalytics> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get<ChannelAnalytics>(`/analytics/channels?${params.toString()}`);
    return response.data;
  }
}

export const analyticsService = new AnalyticsService();

