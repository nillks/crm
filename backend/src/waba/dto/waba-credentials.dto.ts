import { IsString, IsOptional, IsBoolean, IsObject, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWABACredentialsDto {
  @IsString()
  accessToken: string;

  @IsString()
  phoneNumberId: string;

  @IsString()
  businessAccountId: string;

  @IsString()
  @IsOptional()
  appId?: string;

  @IsString()
  @IsOptional()
  appSecret?: string;

  @IsString()
  @IsOptional()
  webhookVerifyToken?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  autoPauseThreshold?: number; // Порог для автопаузы

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateWABACredentialsDto {
  @IsString()
  @IsOptional()
  accessToken?: string;

  @IsString()
  @IsOptional()
  phoneNumberId?: string;

  @IsString()
  @IsOptional()
  businessAccountId?: string;

  @IsString()
  @IsOptional()
  appId?: string;

  @IsString()
  @IsOptional()
  appSecret?: string;

  @IsString()
  @IsOptional()
  webhookVerifyToken?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  autoPauseThreshold?: number; // Порог для автопаузы

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

