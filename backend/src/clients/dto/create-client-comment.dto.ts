import { IsNotEmpty, IsString } from 'class-validator';

export class CreateClientCommentDto {
  @IsNotEmpty()
  @IsString()
  content: string;
}

