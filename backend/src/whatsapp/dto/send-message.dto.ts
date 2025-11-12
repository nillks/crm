import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  phoneNumber: string; // Номер телефона в формате: 79991234567 (без +)

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  ticketId?: string; // Опционально: ID тикета для связи
}

