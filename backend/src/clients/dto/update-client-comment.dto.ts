import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateClientCommentDto {
  @IsNotEmpty()
  @IsString()
  content: string;
}

