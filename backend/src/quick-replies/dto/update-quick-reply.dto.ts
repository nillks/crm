import { IsString, IsEnum, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { QuickReplyChannel } from '../../entities/quick-reply.entity';
import { FileInfoDto } from './create-quick-reply.dto';

export class UpdateQuickReplyDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileInfoDto)
  @IsOptional()
  files?: FileInfoDto[];

  @IsEnum(QuickReplyChannel)
  @IsOptional()
  channel?: QuickReplyChannel;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

