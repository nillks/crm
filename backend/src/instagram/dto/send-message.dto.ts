import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class SendInstagramMessageDto {
  @IsNotEmpty()
  @IsString()
  recipientId: string; // Instagram User ID или Thread ID

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  ticketId?: string; // Опционально: ID тикета для связи
}

