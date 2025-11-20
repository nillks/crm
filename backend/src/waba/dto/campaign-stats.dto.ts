import { IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CampaignStatsFilterDto {
  @IsOptional()
  @IsUUID()
  templateId?: string; // Фильтр по шаблону

  @IsOptional()
  @IsUUID()
  createdById?: string; // Фильтр по создателю

  @IsOptional()
  @IsDateString()
  startDate?: string; // Начало периода

  @IsOptional()
  @IsDateString()
  endDate?: string; // Конец периода
}

export interface CampaignStatsResponse {
  total: number; // Всего кампаний
  pending: number; // Ожидают отправки
  scheduled: number; // Запланированы
  sent: number; // Отправлены
  delivered: number; // Доставлены
  read: number; // Прочитаны
  failed: number; // Неудачные

  // Проценты
  deliveryRate: number; // Процент доставки
  readRate: number; // Процент прочтения
  failureRate: number; // Процент неудач

  // По шаблонам
  byTemplate: Array<{
    templateId: string;
    templateName: string;
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  }>;

  // По датам
  byDate: Array<{
    date: string;
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  }>;

  // По создателям
  byCreator: Array<{
    creatorId: string;
    creatorEmail: string;
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  }>;
}

