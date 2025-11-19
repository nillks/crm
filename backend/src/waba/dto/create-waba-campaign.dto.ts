import { IsUUID, IsEnum, IsObject, IsDateString, IsOptional } from 'class-validator';
import { WABACampaignStatus } from '../../entities/waba-campaign.entity';

export class CreateWABACampaignDto {
  @IsUUID()
  templateId: string;

  @IsUUID()
  clientId: string;

  @IsObject()
  parameters: Record<string, string>; // Параметры для подстановки в шаблон

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsEnum(WABACampaignStatus)
  @IsOptional()
  status?: WABACampaignStatus;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

