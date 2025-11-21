import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsInt, Min, IsUUID, IsObject } from 'class-validator';

export class CreateFunnelStageDto {
  @IsNotEmpty()
  @IsUUID()
  funnelId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  order: number;

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

