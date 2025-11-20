import { IsOptional, IsString, IsEmail, MaxLength, IsIn, IsArray } from 'class-validator';

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telegramId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  whatsappId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  instagramId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'blocked'])
  status?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  customFields?: Record<string, any>;
}

