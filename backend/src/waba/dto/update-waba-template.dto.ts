import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { WABATemplateCategory, WABATemplateStatus } from '../../entities/waba-template.entity';
import { TemplateComponentDto } from './create-waba-template.dto';

export class UpdateWABATemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(WABATemplateCategory)
  @IsOptional()
  category?: WABATemplateCategory;

  @IsEnum(WABATemplateStatus)
  @IsOptional()
  status?: WABATemplateStatus;

  @IsString()
  @IsOptional()
  language?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateComponentDto)
  @IsOptional()
  components?: TemplateComponentDto[];

  @IsString()
  @IsOptional()
  facebookTemplateId?: string;

  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

