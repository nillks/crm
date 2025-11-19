import { IsString, IsEnum, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { QuickReplyChannel } from '../../entities/quick-reply.entity';

export class FileInfoDto {
  @IsString()
  id: string;

  @IsString()
  fileName: string;

  @IsString()
  url: string;

  @IsString()
  mimeType: string;

  @IsString()
  type: string;
}

export class CreateQuickReplyDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  type?: string; // 'text' | 'file'

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileInfoDto)
  @IsOptional()
  files?: FileInfoDto[];

  @IsEnum(QuickReplyChannel)
  channel: QuickReplyChannel;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

