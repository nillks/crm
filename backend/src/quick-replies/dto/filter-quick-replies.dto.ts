import { IsOptional, IsEnum, IsString, IsBoolean } from 'class-validator';
import { QuickReplyChannel } from '../../entities/quick-reply.entity';

export class FilterQuickRepliesDto {
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

