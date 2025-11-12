import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterClientsDto {
  @IsOptional()
  @IsString()
  search?: string; // Поиск по имени, телефону, email

  @IsOptional()
  @IsString()
  name?: string; // Фильтр по имени

  @IsOptional()
  @IsString()
  phone?: string; // Фильтр по телефону

  @IsOptional()
  @IsString()
  email?: string; // Фильтр по email

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'blocked'])
  status?: string; // Фильтр по статусу

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1; // Номер страницы

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10; // Количество элементов на странице

  @IsOptional()
  @IsString()
  @IsIn(['name', 'createdAt', 'updatedAt'])
  sortBy?: string = 'createdAt'; // Поле для сортировки

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC'; // Направление сортировки

  @IsOptional()
  @IsString()
  include?: string; // Связанные данные: tickets,messages,calls
}

