import { IsString, IsOptional, IsBoolean, IsInt, Min, IsObject } from 'class-validator';

export class CreateSupportLineDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxOperators?: number;

  @IsObject()
  @IsOptional()
  settings?: {
    autoAssign?: boolean;
    roundRobin?: boolean;
    priority?: number;
    workingHours?: {
      enabled: boolean;
      timezone?: string;
      weekdays?: number[];
      startTime?: string;
      endTime?: string;
    };
  };
}

export class UpdateSupportLineDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxOperators?: number;

  @IsObject()
  @IsOptional()
  settings?: {
    autoAssign?: boolean;
    roundRobin?: boolean;
    priority?: number;
    workingHours?: {
      enabled: boolean;
      timezone?: string;
      weekdays?: number[];
      startTime?: string;
      endTime?: string;
    };
  };
}

