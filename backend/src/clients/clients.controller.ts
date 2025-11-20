import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto, FilterClientsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../roles/guards/permissions.guard';
import { RequirePermissions } from '../roles/decorators/require-permissions.decorator';
import { Action, Subject } from '../roles/abilities.definition';

@Controller('clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  /**
   * Создать нового клиента
   * Требуется право: create Client
   */
  @Post()
  @RequirePermissions({ action: Action.Create, subject: Subject.Client })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  /**
   * Получить список клиентов с пагинацией и фильтрами
   * Требуется право: read Client
   */
  @Get()
  @RequirePermissions({ action: Action.Read, subject: Subject.Client })
  findAll(@Query() filterDto: FilterClientsDto) {
    return this.clientsService.findAll(filterDto);
  }

  /**
   * Получить клиента по ID
   * Требуется право: read Client
   */
  @Get(':id')
  @RequirePermissions({ action: Action.Read, subject: Subject.Client })
  findOne(
    @Param('id') id: string,
    @Query('include') include?: string,
  ) {
    return this.clientsService.findOne(id, include);
  }

  /**
   * Обновить клиента
   * Требуется право: update Client
   */
  @Put(':id')
  @RequirePermissions({ action: Action.Update, subject: Subject.Client })
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
    return this.clientsService.update(id, updateClientDto);
  }

  /**
   * Удалить клиента
   * Требуется право: delete Client (или manage Client для админа)
   */
  @Delete(':id')
  @RequirePermissions({ action: Action.Delete, subject: Subject.Client })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }

  /**
   * Импорт клиентов из Excel/CSV файла
   * POST /clients/import
   */
  @Post('import')
  @RequirePermissions({ action: Action.Create, subject: Subject.Client })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async importClients(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('Файл не предоставлен');
    }

    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      return this.clientsService.importFromExcel(file);
    } else if (fileExtension === 'csv') {
      return this.clientsService.importFromCSV(file);
    } else {
      throw new Error(
        'Неподдерживаемый формат файла. Используйте Excel (.xlsx, .xls) или CSV (.csv)',
      );
    }
  }
}

