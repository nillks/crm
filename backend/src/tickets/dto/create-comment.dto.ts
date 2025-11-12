import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

