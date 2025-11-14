import { Controller, Get, Post } from '@nestjs/common';
import { RolesService } from './roles.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Public()
  @Get()
  async getAllRoles() {
    return this.rolesService.findAll();
  }

  @Public()
  @Post('seed')
  async seedRoles() {
    return this.rolesService.seedRoles();
  }
}

