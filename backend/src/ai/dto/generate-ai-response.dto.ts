import { IsString, IsOptional, IsNumber, Min, Max, IsUUID } from 'class-validator';

export class GenerateAiResponseDto {
  @IsString()
  message: string;

  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsUUID()
  @IsOptional()
  userId?: string;

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

