import { IsNotEmpty, IsString, IsOptional, IsEmail, MaxLength, IsIn } from 'class-validator';

export class CreateClientDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

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

