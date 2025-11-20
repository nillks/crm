import api from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  status: string;
  role: {
    id: string;
    name: string;
  };
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UpdateProfileDto {
  name?: string;
  phone?: string;
  email?: string;
}

export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

class UsersService {
  /**
   * Получить текущего пользователя
   */
  async getMe(): Promise<User> {
    const response = await api.get<User>('/users/me');
    return response.data;
  }

  /**
   * Обновить профиль
   */
  async updateProfile(updateDto: UpdateProfileDto): Promise<User> {
    const response = await api.put<User>('/users/me/profile', updateDto);
    return response.data;
  }

  /**
   * Изменить пароль
   */
  async changePassword(changePasswordDto: ChangePasswordDto): Promise<void> {
    await api.put('/users/me/password', changePasswordDto);
  }

  /**
   * Получить список всех пользователей
   */
  async getUsers(): Promise<User[]> {
    const response = await api.get<User[]>('/users');
    return response.data;
  }
}

export const usersService = new UsersService();

