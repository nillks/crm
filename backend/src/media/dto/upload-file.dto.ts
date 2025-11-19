import { IsUUID, IsOptional, IsString } from 'class-validator';

export class UploadFileDto {
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsUUID()
  @IsOptional()
  messageId?: string;

  @IsUUID()
  @IsOptional()
  ticketId?: string;
}

