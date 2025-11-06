import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: {
      id: string;
      name: string;
    };
  };
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    // Проверяем, существует ли пользователь с таким email
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Создаем пользователя
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    // Генерируем токены
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: {
          id: user.role.id,
          name: user.role.name,
        },
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    // Находим пользователя
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Проверяем статус пользователя
    if (user.status !== 'active') {
      throw new UnauthorizedException('User account is inactive');
    }

    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Обновляем время последнего входа
    await this.usersService.updateLastLogin(user.id);

    // Генерируем токены
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: {
          id: user.role.id,
          name: user.role.name,
        },
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET', 'your-refresh-secret-key'),
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const accessToken = this.generateAccessToken(user);

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(user: any) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET', 'your-refresh-secret-key'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private generateAccessToken(user: any): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET', 'your-secret-key'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '24h'),
    });
  }
}
