export class ChannelAnalyticsDto {
  /**
   * Аналитика по каналам
   */
  channels: {
    channel: string;
    totalTickets: number;
    closedTickets: number;
    averageResolutionTime: number; // в часах
    averageResponseTime: number; // в минутах
    totalMessages: number;
    unreadMessages: number;
  }[];

  /**
   * Общая статистика
   */
  summary: {
    totalTickets: number;
    totalMessages: number;
    totalUnreadMessages: number;
    averageResolutionTime: number;
    averageResponseTime: number;
  };

  /**
   * Период расчёта
   */
  period: {
    startDate: Date;
    endDate: Date;
  };
}

