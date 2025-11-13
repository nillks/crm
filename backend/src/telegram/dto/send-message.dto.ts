import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class SendTelegramMessageDto {
  @IsNotEmpty()
  @IsString()
  chatId: string; // Telegram chat ID (число или строка)

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  ticketId?: string; // Опционально: ID тикета для связи
}

