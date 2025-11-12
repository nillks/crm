import { IsNotEmpty, IsEnum } from 'class-validator';
import { TicketStatus } from '../../entities/ticket.entity';

export class UpdateStatusDto {
  @IsNotEmpty()
  @IsEnum(TicketStatus)
  status: TicketStatus;
}

