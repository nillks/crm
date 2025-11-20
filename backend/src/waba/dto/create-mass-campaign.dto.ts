import { IsUUID, IsObject, IsDateString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WABACampaignStatus } from '../../entities/waba-campaign.entity';
import { FilterClientsDto } from '../../clients/dto/filter-clients.dto';

export class CreateMassWABACampaignDto {
  @IsUUID()
  templateId: string;

  @ValidateNested()
  @Type(() => FilterClientsDto)
  clientFilters: FilterClientsDto; // Фильтры для выбора клиентов

  @IsObject()
  parameters: Record<string, string>; // Параметры для подстановки в шаблон (одинаковые для всех)

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsOptional()
  limit?: number; // Максимальное количество клиентов для рассылки (опционально)
}

