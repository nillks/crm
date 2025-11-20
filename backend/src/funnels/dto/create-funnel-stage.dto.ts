import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { IsUUID } from 'class-validator';

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
}

