import { IsOptional, IsEnum, IsInt, Min, Max, IsUUID, IsDateString, IsString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { TaskStatus, TaskPriority } from '../../entities/task.entity';

export class FilterTasksDto {
  @IsUUID()
  @IsOptional()
  clientId?: string;

  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  priority?: TaskPriority;

  @IsString()
  @IsOptional()
  category?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return 20;
    const num = Number(value);
    return isNaN(num) ? 20 : num;
  })
  limit?: number = 20;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  })
  page?: number = 0;
}

