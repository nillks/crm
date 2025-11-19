import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { ClientsModule } from './clients/clients.module';
import { TicketsModule } from './tickets/tickets.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { TelegramModule } from './telegram/telegram.module';
import { InstagramModule } from './instagram/instagram.module';
import { AIModule } from './ai/ai.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MediaModule } from './media/media.module';
import { TasksModule } from './tasks/tasks.module';
import { QuickRepliesModule } from './quick-replies/quick-replies.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AllEntities } from './entities';
import { TestPermissionsController } from './roles/test-permissions.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env',
        path.resolve(process.cwd(), '.env'),
        path.resolve(__dirname, '../.env'),
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // Поддержка DATABASE_URL для Render и других платформ
        const databaseUrl = configService.get('DATABASE_URL');
        if (databaseUrl) {
          // Парсим DATABASE_URL: postgresql://user:password@host:port/database
          const url = new URL(databaseUrl);
          return {
            type: 'postgres',
            host: url.hostname,
            port: parseInt(url.port) || 5432,
            username: url.username,
            password: url.password,
            database: url.pathname.slice(1), // Убираем первый слэш
            entities: AllEntities,
            synchronize: configService.get('DB_SYNCHRONIZE') === 'true',
            logging: configService.get('NODE_ENV') === 'development',
            migrations: ['dist/migrations/*.js'],
            migrationsRun: configService.get('DB_RUN_MIGRATIONS') === 'true',
            autoLoadEntities: true,
            ssl: url.hostname !== 'localhost' && url.hostname !== '127.0.0.1' ? { rejectUnauthorized: false } : false,
          };
        }
        // Fallback на отдельные переменные
        return {
          type: 'postgres',
          host: configService.get('DB_HOST', 'localhost'),
          port: configService.get('DB_PORT', 5432),
          username: configService.get('DB_USERNAME', 'postgres'),
          password: configService.get('DB_PASSWORD', 'postgres'),
          database: configService.get('DB_DATABASE', 'crm_db'),
          entities: AllEntities,
          synchronize: configService.get('DB_SYNCHRONIZE') === 'true' || configService.get('NODE_ENV') !== 'production',
          logging: configService.get('NODE_ENV') === 'development',
          migrations: ['dist/migrations/*.js'],
          migrationsRun: configService.get('DB_RUN_MIGRATIONS') === 'true',
          autoLoadEntities: true,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    ClientsModule,
    TicketsModule,
    WhatsAppModule,
    TelegramModule,
    InstagramModule,
    AIModule,
    AnalyticsModule,
    MediaModule,
    TasksModule,
    QuickRepliesModule,
  ],
  controllers: [AppController, HealthController, TestPermissionsController],
  providers: [
    AppService,
    HealthService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
