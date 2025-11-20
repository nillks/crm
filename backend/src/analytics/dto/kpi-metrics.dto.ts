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
   * Количество коротких звонков (менее 30 секунд)
   */
  shortCalls?: number;

  /**
   * Количество необработанных клиентов (без тикетов)
   */
  unprocessedClients?: number;

  /**
   * Количество безуспешных коммуникаций (тикеты со статусом OVERDUE)
   */
  unsuccessfulCommunications?: number;

  /**
   * Период расчёта
   */
  period: {
    startDate: Date;
    endDate: Date;
  };
}

