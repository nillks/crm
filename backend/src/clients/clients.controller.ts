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
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto, FilterClientsDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../roles/guards/permissions.guard';
import { RequirePermissions } from '../roles/decorators/require-permissions.decorator';
import { Action, Subject } from '../roles/abilities.definition';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

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
   * Экспорт клиентов в Excel файл
   * GET /clients/export
   */
  @Get('export')
  @RequirePermissions({ action: Action.Read, subject: Subject.Client })
  async exportClients(
    @Query() filterDto: FilterClientsDto,
    @Res({ passthrough: false }) res: Response,
  ) {
    try {
      const buffer = await this.clientsService.exportToExcel(filterDto);
      const fileName = `clients_export_${Date.now()}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Length', buffer.length.toString());
      res.send(buffer);
    } catch (error: any) {
      // Важно: если используем @Res(), нужно явно отправить ответ
      if (!res.headersSent) {
        res.status(500).json({
          message: error.message || 'Ошибка при экспорте клиентов',
        });
      }
    }
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

  /**
   * Получить комментарии клиента
   * GET /clients/:id/comments
   */
  @Get(':id/comments')
  @RequirePermissions({ action: Action.Read, subject: Subject.Client })
  getComments(@Param('id') id: string) {
    return this.clientsService.getClientComments(id);
  }

  /**
   * Создать комментарий к клиенту
   * POST /clients/:id/comments
   */
  @Post(':id/comments')
  @RequirePermissions({ action: Action.Update, subject: Subject.Client })
  @HttpCode(HttpStatus.CREATED)
  createComment(
    @Param('id') id: string,
    @Body() createCommentDto: { content: string },
    @GetUser() user: User,
  ) {
    return this.clientsService.createClientComment(id, user.id, createCommentDto.content);
  }

  /**
   * Обновить комментарий клиента
   * PUT /clients/:id/comments/:commentId
   */
  @Put(':id/comments/:commentId')
  @RequirePermissions({ action: Action.Update, subject: Subject.Client })
  updateComment(
    @Param('commentId') commentId: string,
    @Body() updateCommentDto: { content: string },
    @GetUser() user: User,
  ) {
    return this.clientsService.updateClientComment(commentId, user.id, updateCommentDto.content);
  }

  /**
   * Удалить комментарий клиента
   * DELETE /clients/:id/comments/:commentId
   */
  @Delete(':id/comments/:commentId')
  @RequirePermissions({ action: Action.Update, subject: Subject.Client })
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteComment(@Param('commentId') commentId: string, @GetUser() user: User) {
    return this.clientsService.deleteClientComment(commentId, user.id);
  }
}

