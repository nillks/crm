import { Controller, Get, HttpStatus, HttpException } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  async check() {
    const healthStatus = await this.healthService.getHealthStatus();
    
    if (healthStatus.status === 'healthy') {
      return {
        ...healthStatus,
        statusCode: HttpStatus.OK,
      };
    } else {
      throw new HttpException(
        {
          ...healthStatus,
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
