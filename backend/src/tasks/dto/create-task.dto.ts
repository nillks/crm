import { IsString, IsUUID, IsOptional, IsEnum, IsInt, Min, Max, IsDateString } from 'class-validator';
import { TaskStatus, TaskPriority } from '../../entities/task.entity';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  clientId: string;

  @IsUUID()
  assignedToId: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  priority?: TaskPriority;

  @IsString()
  @IsOptional()
  category?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}

