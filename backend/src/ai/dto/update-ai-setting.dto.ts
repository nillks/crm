import { IsBoolean, IsOptional, IsString, IsNumber, Min, Max, IsEnum, IsUUID } from 'class-validator';
import { AiProvider } from '../../entities/ai-setting.entity';

export class UpdateAiSettingDto {
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsEnum(AiProvider)
  @IsOptional()
  provider?: AiProvider;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  systemPrompt?: string;

  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxTokens?: number;
}

