export class SLAMetricsDto {
  /**
   * Среднее время обработки тикета (в часах)
   */
  averageResolutionTime: number;

  /**
   * Медианное время обработки тикета (в часах)
   */
  medianResolutionTime: number;

  /**
   * Процент тикетов, закрытых в срок
   */
  onTimeClosureRate: number;

  /**
   * Общее количество закрытых тикетов
   */
  totalClosedTickets: number;

  /**
   * Количество тикетов, закрытых в срок
   */
  onTimeClosedTickets: number;

  /**
   * Среднее время ответа на сообщение (в минутах)
   */
  averageResponseTime: number;

  /**
   * Медианное время ответа (в минутах)
   */
  medianResponseTime: number;

  /**
   * Период расчёта
   */
  period: {
    startDate: Date;
    endDate: Date;
  };
}

