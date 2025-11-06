import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async checkDatabase(): Promise<{ status: string; message: string; timestamp: string }> {
    try {
      // Проверяем подключение к БД
      await this.dataSource.query('SELECT 1');
      
      return {
        status: 'ok',
        message: 'Database connection successful',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Database connection failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getHealthStatus() {
    const dbStatus = await this.checkDatabase();
    
    return {
      status: dbStatus.status === 'ok' ? 'healthy' : 'unhealthy',
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
