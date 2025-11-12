import { IsNotEmpty, IsString, IsOptional, IsUUID, IsEnum, IsInt, Min, Max, IsDateString } from 'class-validator';
import { TicketChannel } from '../../entities/ticket.entity';

export class CreateTicketDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsUUID()
  clientId: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsNotEmpty()
  @IsEnum(TicketChannel)
  channel: TicketChannel;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  priority?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

