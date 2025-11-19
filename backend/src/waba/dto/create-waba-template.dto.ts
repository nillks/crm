import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { WABATemplateCategory, WABATemplateComponentType, WABATemplateStatus } from '../../entities/waba-template.entity';

export class TemplateComponentDto {
  @IsEnum(WABATemplateComponentType)
  type: WABATemplateComponentType;

  @IsString()
  @IsOptional()
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';

  @IsString()
  @IsOptional()
  text?: string;

  @IsObject()
  @IsOptional()
  example?: {
    header_text?: string[];
    body_text?: string[][];
  };

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Object)
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

export class CreateWABATemplateDto {
  @IsString()
  name: string;

  @IsEnum(WABATemplateCategory)
  category: WABATemplateCategory;

  @IsString()
  @IsOptional()
  language?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateComponentDto)
  components: TemplateComponentDto[];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

