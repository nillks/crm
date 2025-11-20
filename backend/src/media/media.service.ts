import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { MediaFile, MediaFileType } from '../entities/media-file.entity';
import { Client } from '../entities/client.entity';
import { Message } from '../entities/message.entity';
import { Ticket } from '../entities/ticket.entity';
import { CallLog } from '../entities/call-log.entity';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);
const writeFile = promisify(fs.writeFile);

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private readonly uploadDir: string;
  private readonly maxFileSize: number = 50 * 1024 * 1024; // 50MB
  private readonly retentionDays: number = 180; // 6 месяцев

  constructor(
    private configService: ConfigService,
    @InjectRepository(MediaFile)
    private mediaFileRepository: Repository<MediaFile>,
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(CallLog)
    private callLogsRepository: Repository<CallLog>,
  ) {
    this.uploadDir = this.configService.get('MEDIA_UPLOAD_DIR', path.join(process.cwd(), 'uploads'));
  }

  async onModuleInit() {
    // Создаем директорию для загрузок, если её нет
    try {
      await mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`📁 Upload directory: ${this.uploadDir}`);
    } catch (error) {
      this.logger.error(`Failed to create upload directory: ${error}`);
    }

    // Запускаем очистку старых файлов
    this.startRetentionCleanup();
  }

  /**
   * Определить тип файла по MIME type
   */
  private getFileType(mimeType: string): MediaFileType {
    if (mimeType.startsWith('image/')) {
      return MediaFileType.IMAGE;
    }
    if (mimeType === 'application/pdf') {
      return MediaFileType.PDF;
    }
    if (mimeType === 'application/msword') {
      return MediaFileType.DOC;
    }
    if (
      mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return MediaFileType.DOCX;
    }
    if (mimeType.startsWith('audio/')) {
      return MediaFileType.AUDIO;
    }
    if (mimeType.startsWith('video/')) {
      return MediaFileType.VIDEO;
    }
    return MediaFileType.OTHER;
  }

  /**
   * Проверить, разрешен ли тип файла
   */
  private isAllowedFileType(mimeType: string): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
    ];
    return allowedTypes.includes(mimeType);
  }

  /**
   * Загрузить файл
   */
  async uploadFile(
    file: Express.Multer.File,
    clientId?: string,
    messageId?: string,
    ticketId?: string,
  ): Promise<MediaFile> {
    if (!file) {
      throw new BadRequestException('Файл не предоставлен');
    }

    // Проверка размера файла
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `Размер файла превышает максимальный (${this.maxFileSize / 1024 / 1024}MB)`,
      );
    }

    // Проверка типа файла
    if (!this.isAllowedFileType(file.mimetype)) {
      throw new BadRequestException(`Тип файла ${file.mimetype} не разрешен`);
    }

    // Проверка clientId - обязателен, если не указан messageId
    if (!clientId && !messageId) {
      throw new BadRequestException('Необходимо указать clientId или messageId');
    }

    if (clientId) {
      const client = await this.clientsRepository.findOne({ where: { id: clientId } });
      if (!client) {
        throw new NotFoundException(`Клиент с ID ${clientId} не найден`);
      }
    }

    // Проверка messageId, если указан, и получение clientId из сообщения
    let finalClientId = clientId;
    if (messageId) {
      const message = await this.messagesRepository.findOne({
        where: { id: messageId },
        select: ['id', 'clientId'],
      });
      if (!message) {
        throw new NotFoundException(`Сообщение с ID ${messageId} не найдено`);
      }
      // Если clientId не указан, берем из сообщения
      if (!finalClientId) {
        finalClientId = message.clientId;
      }
    }

    // Проверка ticketId, если указан
    if (ticketId) {
      const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId } });
      if (!ticket) {
        throw new NotFoundException(`Тикет с ID ${ticketId} не найден`);
      }
    }

    // Генерируем уникальное имя файла с ID (будет создан после сохранения в БД)
    const fileExtension = path.extname(file.originalname);
    const tempId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const fileName = `${tempId}${fileExtension}`;
    const filePath = path.join(this.uploadDir, fileName);

    // Сохраняем файл
    await writeFile(filePath, file.buffer);

    // Генерируем временный URL (будет обновлен после сохранения в БД)
    const baseUrl = this.configService.get('BASE_URL', 'http://localhost:3000');
    const tempUrl = `${baseUrl}/api/media/${fileName}`;

    // Определяем тип файла
    const fileType = this.getFileType(file.mimetype);

    // Создаем запись в БД
    const mediaFile = this.mediaFileRepository.create({
      fileName: file.originalname,
      mimeType: file.mimetype,
      type: fileType,
      size: file.size,
      url: tempUrl, // Временный URL
      thumbnailUrl: fileType === MediaFileType.IMAGE ? tempUrl : null,
      clientId: finalClientId!,
      messageId: messageId || undefined,
    });

    const savedFile = await this.mediaFileRepository.save(mediaFile);

    // Переименовываем файл с ID
    const newFileName = `${savedFile.id}${fileExtension}`;
    const newFilePath = path.join(this.uploadDir, newFileName);
    fs.renameSync(filePath, newFilePath);

    // Обновляем URL с правильным ID
    const finalUrl = `${baseUrl}/api/media/${savedFile.id}`;
    savedFile.url = finalUrl;
    if (savedFile.thumbnailUrl) {
      savedFile.thumbnailUrl = finalUrl;
    }
    await this.mediaFileRepository.save(savedFile);

    this.logger.log(`✅ File uploaded: ${savedFile.id} - ${file.originalname}`);

    return savedFile;
  }

  /**
   * Получить файл по ID
   */
  async getFile(id: string): Promise<MediaFile> {
    const file = await this.mediaFileRepository.findOne({ where: { id } });

    if (!file) {
      throw new NotFoundException(`Файл с ID ${id} не найден`);
    }

    return file;
  }

  /**
   * Получить путь к файлу на диске
   */
  async getFilePath(id: string): Promise<string> {
    const file = await this.getFile(id);
    const fileName = path.basename(file.url);
    return path.join(this.uploadDir, fileName);
  }

  /**
   * Получить подписанный URL (для S3 в будущем, пока просто возвращаем обычный URL)
   */
  async getSignedUrl(id: string, expiresIn: number = 3600): Promise<string> {
    const file = await this.getFile(id);
    // В будущем здесь будет генерация подписанного URL для S3
    // Пока просто возвращаем обычный URL
    return file.url;
  }

  /**
   * Удалить файл
   */
  async deleteFile(id: string): Promise<void> {
    const file = await this.getFile(id);

    // Удаляем файл с диска
    try {
      const filePath = await this.getFilePath(id);
      await access(filePath);
      await unlink(filePath);
      this.logger.log(`🗑️ File deleted from disk: ${filePath}`);
    } catch (error) {
      this.logger.warn(`⚠️ File not found on disk, continuing with DB deletion: ${error}`);
    }

    // Удаляем запись из БД
    await this.mediaFileRepository.remove(file);

    this.logger.log(`✅ File deleted: ${id}`);
  }

  /**
   * Получить файлы по clientId
   */
  async getFilesByClient(clientId: string): Promise<MediaFile[]> {
    return this.mediaFileRepository.find({
      where: { clientId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Получить файлы по messageId
   */
  async getFilesByMessage(messageId: string): Promise<MediaFile[]> {
    return this.mediaFileRepository.find({
      where: { messageId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Очистка старых файлов (ретеншн политика)
   */
  private async cleanupOldFiles(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    const oldFiles = await this.mediaFileRepository.find({
      where: {
        createdAt: LessThan(cutoffDate),
      },
    });

    this.logger.log(`🧹 Found ${oldFiles.length} files older than ${this.retentionDays} days`);

    for (const file of oldFiles) {
      try {
        await this.deleteFile(file.id);
      } catch (error) {
        this.logger.error(`Failed to delete old file ${file.id}: ${error}`);
      }
    }
  }

  /**
   * Автоматическая архивация старых файлов (запускается каждый день в 2:00)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async archiveOldFiles(): Promise<void> {
    this.logger.log('🔄 Starting automatic file archiving...');
    
    const archiveCutoffDate = new Date();
    archiveCutoffDate.setDate(archiveCutoffDate.getDate() - this.retentionDays);
    
    const filesToArchive = await this.mediaFileRepository.find({
      where: {
        createdAt: LessThan(archiveCutoffDate),
      },
    });

    if (filesToArchive.length === 0) {
      this.logger.log('✅ No files to archive');
      return;
    }

    this.logger.log(`📦 Archiving ${filesToArchive.length} files...`);

    // Создаем директорию для архива, если её нет
    const archiveDir = path.join(this.uploadDir, 'archive');
    try {
      await mkdir(archiveDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create archive directory:', error);
      return;
    }

    let archivedCount = 0;
    for (const file of filesToArchive) {
      try {
        const filePath = await this.getFilePath(file.id);
        const fileName = path.basename(file.url);
        const archivePath = path.join(archiveDir, fileName);

        // Перемещаем файл в архив
        if (fs.existsSync(filePath)) {
          fs.renameSync(filePath, archivePath);
          
          // Обновляем метаданные файла
          const metadata = file.metadata || {};
          metadata.archived = true;
          metadata.archivedAt = new Date().toISOString();
          metadata.archivePath = archivePath;
          
          // Обновляем запись в БД
          await this.mediaFileRepository.update(file.id, { metadata });
          archivedCount++;
        }
      } catch (error) {
        this.logger.error(`Failed to archive file ${file.id}:`, error);
      }
    }

    this.logger.log(`✅ Archived ${archivedCount} files`);
  }

  /**
   * Получить список архивированных файлов
   */
  async getArchivedFiles(page: number = 1, limit: number = 20): Promise<{
    data: MediaFile[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.mediaFileRepository.findAndCount({
      where: {
        metadata: {
          archived: true,
        } as any,
      },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Восстановить файл из архива
   */
  async restoreFromArchive(fileId: string): Promise<MediaFile> {
    const file = await this.mediaFileRepository.findOne({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException(`Файл с ID ${fileId} не найден`);
    }

    const metadata = file.metadata || {};
    if (!metadata.archived || !metadata.archivePath) {
      throw new BadRequestException('Файл не находится в архиве');
    }

    const archivePath = metadata.archivePath;
    const originalPath = await this.getFilePath(file.id);

    // Проверяем, существует ли файл в архиве
    if (!fs.existsSync(archivePath)) {
      throw new NotFoundException('Файл не найден в архиве');
    }

    // Восстанавливаем файл из архива
    try {
      // Создаем директорию для восстановленного файла, если её нет
      const originalDir = path.dirname(originalPath);
      await mkdir(originalDir, { recursive: true });

      // Копируем файл обратно
      fs.copyFileSync(archivePath, originalPath);

      // Обновляем метаданные
      metadata.archived = false;
      metadata.restoredAt = new Date().toISOString();
      metadata.restoredFrom = archivePath;

      await this.mediaFileRepository.update(fileId, { metadata });

      this.logger.log(`✅ File restored from archive: ${fileId}`);

      return this.mediaFileRepository.findOne({ where: { id: fileId } });
    } catch (error) {
      this.logger.error(`Failed to restore file ${fileId}:`, error);
      throw new BadRequestException(`Не удалось восстановить файл: ${error.message}`);
    }
  }

  /**
   * Запустить периодическую очистку старых файлов
   */
  private startRetentionCleanup(): void {
    // Запускаем очистку каждые 24 часа
    setInterval(() => {
      this.cleanupOldFiles();
    }, 24 * 60 * 60 * 1000);

    // Запускаем первую очистку через 1 час после старта
    setTimeout(() => {
      this.cleanupOldFiles();
    }, 60 * 60 * 1000);

    this.logger.log(`🔄 Retention cleanup scheduled (${this.retentionDays} days)`);
  }
}

