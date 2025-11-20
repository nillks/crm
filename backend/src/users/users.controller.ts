import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

export class UpdateProfileDto {
  name?: string;
  phone?: string;
  email?: string;
}

export class ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Получить текущего пользователя
   * GET /users/me
   */
  @Get('me')
  async getMe(@GetUser() user: User) {
    const fullUser = await this.usersService.findById(user.id);
    return {
      id: fullUser.id,
      email: fullUser.email,
      name: fullUser.name,
      phone: fullUser.phone,
      status: fullUser.status,
      role: {
        id: fullUser.role.id,
        name: fullUser.role.name,
      },
      lastLoginAt: fullUser.lastLoginAt,
      createdAt: fullUser.createdAt,
      updatedAt: fullUser.updatedAt,
    };
  }

  /**
   * Обновить профиль
   * PUT /users/me/profile
   */
  @Put('me/profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(@GetUser() user: User, @Body() updateDto: UpdateProfileDto) {
    const updatedUser = await this.usersService.updateProfile(user.id, updateDto);
    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      phone: updatedUser.phone,
      status: updatedUser.status,
      role: {
        id: updatedUser.role.id,
        name: updatedUser.role.name,
      },
    };
  }

  /**
   * Изменить пароль
   * PUT /users/me/password
   */
  @Put('me/password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@GetUser() user: User, @Body() changePasswordDto: ChangePasswordDto) {
    await this.usersService.changePassword(user.id, changePasswordDto.oldPassword, changePasswordDto.newPassword);
    return { message: 'Пароль успешно изменен' };
  }

  /**
   * Получить список всех пользователей
   * GET /users
   */
  @Get()
  async getUsers() {
    return this.usersService.findAll();
  }

  /**
   * Получить статистику лимитов
   * GET /users/limits
   */
  @Get('limits')
  async getLimits() {
    return this.usersService.getUsersLimits();
  }
}

