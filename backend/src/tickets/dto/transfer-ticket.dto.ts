import { IsNotEmpty, IsUUID, IsOptional, IsString } from 'class-validator';

export class TransferTicketDto {
  @IsNotEmpty()
  @IsUUID()
  toUserId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

