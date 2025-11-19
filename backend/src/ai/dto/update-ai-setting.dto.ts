import { IsBoolean, IsOptional, IsString, IsNumber, Min, Max, IsEnum, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AiProvider } from '../../entities/ai-setting.entity';

export class UpdateAiSettingDto {
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  isEnabled?: boolean;

  @IsEnum(AiProvider)
  @IsOptional()
  provider?: AiProvider;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  systemPrompt?: string | null;

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  @Max(2)
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  temperature?: number;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  maxTokens?: number;
}

