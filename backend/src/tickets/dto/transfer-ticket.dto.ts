import { IsNotEmpty, IsUUID, IsOptional, IsString, IsEnum, ValidateIf } from 'class-validator';
import { RoleName } from '../../entities/role.entity';

export class TransferTicketDto {
  // Либо toUserId, либо toRoleName должен быть указан
  @ValidateIf((o) => !o.toRoleName)
  @IsNotEmpty({ message: 'Необходимо указать либо toUserId, либо toRoleName' })
  @IsUUID()
  toUserId?: string;

  @ValidateIf((o) => !o.toUserId)
  @IsNotEmpty({ message: 'Необходимо указать либо toUserId, либо toRoleName' })
  @IsEnum(RoleName)
  toRoleName?: RoleName; // Перевод на линию (operator1, operator2, operator3)

  @IsOptional()
  @IsString()
  reason?: string;
}

