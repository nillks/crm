export class KPIMetricsDto {
  /**
   * Количество непринятых звонков
   */
  missedCalls: number;

  /**
   * Количество непрочитанных входящих сообщений
   */
  unreadMessages: number;

  /**
   * Количество просроченных задач
   */
  overdueTasks: number;

  /**
   * Общее количество активных тикетов
   */
  activeTickets: number;

  /**
   * Количество тикетов со статусом NEW
   */
  newTickets: number;

  /**
   * Количество тикетов со статусом IN_PROGRESS
   */
  inProgressTickets: number;

  /**
   * Количество тикетов со статусом OVERDUE
   */
  overdueTickets: number;

  /**
   * Период расчёта
   */
  period: {
    startDate: Date;
    endDate: Date;
  };
}

