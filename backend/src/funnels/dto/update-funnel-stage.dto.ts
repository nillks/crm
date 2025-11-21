import { IsOptional, IsString, IsBoolean, IsInt, Min, IsUUID, IsObject } from 'class-validator';

export class UpdateFunnelStageDto {
  @IsOptional()
  @IsUUID()
  funnelId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsString()
  ticketStatus?: string;

  @IsOptional()
  @IsBoolean()
  isFinal?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUUID()
  nextStageId?: string;

  @IsOptional()
  @IsObject()
  autoTransitionRules?: {
    onStatusChange?: string[];
    onTimeElapsed?: number;
    onAction?: string[];
    conditions?: {
      minComments?: number;
      minMessages?: number;
      requiredStatus?: string;
    };
  };
}

