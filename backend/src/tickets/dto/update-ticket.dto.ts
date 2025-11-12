import { IsOptional, IsString, IsUUID, IsEnum, IsInt, Min, Max, IsDateString } from 'class-validator';
import { TicketChannel } from '../../entities/ticket.entity';

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsEnum(TicketChannel)
  channel?: TicketChannel;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  priority?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

