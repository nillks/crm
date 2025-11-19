import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadFileDto } from './dto/upload-file.dto';
import * as fs from 'fs';
import * as path from 'path';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * Загрузить файл
   * POST /media/upload
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query() dto: UploadFileDto,
  ) {
    return this.mediaService.uploadFile(file, dto.clientId, dto.messageId, dto.ticketId);
  }

  /**
   * Получить файл по ID
   * GET /media/:id
   */
  @Get(':id')
  async getFile(@Param('id') id: string, @Res() res: Response) {
    try {
      const file = await this.mediaService.getFile(id);
      const filePath = await this.mediaService.getFilePath(id);

      // Проверяем существование файла
      if (!fs.existsSync(filePath)) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'Файл не найден на диске',
        });
      }

      // Отправляем файл
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.fileName)}"`);
      res.sendFile(path.resolve(filePath));
    } catch (error: any) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: error.message || 'Файл не найден',
      });
    }
  }

  /**
   * Получить подписанный URL
   * GET /media/:id/url
   */
  @Get(':id/url')
  async getSignedUrl(@Param('id') id: string, @Query('expiresIn') expiresIn?: string) {
    const expires = expiresIn ? parseInt(expiresIn, 10) : 3600;
    const url = await this.mediaService.getSignedUrl(id, expires);
    return { url, expiresIn: expires };
  }

  /**
   * Удалить файл
   * DELETE /media/:id
   */
  @Delete(':id')
  async deleteFile(@Param('id') id: string) {
    await this.mediaService.deleteFile(id);
    return { message: 'Файл успешно удален' };
  }

  /**
   * Получить файлы клиента
   * GET /media/client/:clientId
   */
  @Get('client/:clientId')
  async getFilesByClient(@Param('clientId') clientId: string) {
    return this.mediaService.getFilesByClient(clientId);
  }

  /**
   * Получить файлы сообщения
   * GET /media/message/:messageId
   */
  @Get('message/:messageId')
  async getFilesByMessage(@Param('messageId') messageId: string) {
    return this.mediaService.getFilesByMessage(messageId);
  }
}

