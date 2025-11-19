import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuickReply, QuickReplyChannel } from '../entities/quick-reply.entity';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';
import { FilterQuickRepliesDto } from './dto/filter-quick-replies.dto';

@Injectable()
export class QuickRepliesService {
  private readonly logger = new Logger(QuickRepliesService.name);

  constructor(
    @InjectRepository(QuickReply)
    private quickRepliesRepository: Repository<QuickReply>,
  ) {}

  /**
   * Создать шаблон
   */
  async create(createDto: CreateQuickReplyDto): Promise<QuickReply> {
    const quickReply = this.quickRepliesRepository.create({
      ...createDto,
      type: createDto.type || 'text',
      files: createDto.files || [],
      isActive: createDto.isActive !== undefined ? createDto.isActive : true,
    });

    const saved = await this.quickRepliesRepository.save(quickReply);
    this.logger.log(`✅ Quick reply created: ${saved.id} - ${saved.title}`);

    return saved;
  }

  /**
   * Получить все шаблоны с фильтрами
   */
  async findAll(filterDto: FilterQuickRepliesDto = {}): Promise<QuickReply[]> {
    const queryBuilder = this.quickRepliesRepository.createQueryBuilder('quickReply');

    if (filterDto.channel) {
      queryBuilder.andWhere(
        '(quickReply.channel = :channel OR quickReply.channel = :all)',
        { channel: filterDto.channel, all: QuickReplyChannel.ALL },
      );
    }

    if (filterDto.category) {
      queryBuilder.andWhere('quickReply.category = :category', {
        category: filterDto.category,
      });
    }

    if (filterDto.isActive !== undefined) {
      queryBuilder.andWhere('quickReply.isActive = :isActive', {
        isActive: filterDto.isActive,
      });
    }

    return queryBuilder
      .orderBy('quickReply.usageCount', 'DESC')
      .addOrderBy('quickReply.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Получить шаблон по ID
   */
  async findOne(id: string): Promise<QuickReply> {
    const quickReply = await this.quickRepliesRepository.findOne({ where: { id } });

    if (!quickReply) {
      throw new NotFoundException(`Шаблон с ID ${id} не найден`);
    }

    return quickReply;
  }

  /**
   * Обновить шаблон
   */
  async update(id: string, updateDto: UpdateQuickReplyDto): Promise<QuickReply> {
    const quickReply = await this.findOne(id);

    Object.assign(quickReply, updateDto);

    const updated = await this.quickRepliesRepository.save(quickReply);
    this.logger.log(`✅ Quick reply updated: ${updated.id} - ${updated.title}`);

    return updated;
  }

  /**
   * Удалить шаблон
   */
  async remove(id: string): Promise<void> {
    const quickReply = await this.findOne(id);
    await this.quickRepliesRepository.remove(quickReply);
    this.logger.log(`🗑️ Quick reply deleted: ${id}`);
  }

  /**
   * Увеличить счетчик использования
   */
  async incrementUsage(id: string): Promise<void> {
    await this.quickRepliesRepository.increment({ id }, 'usageCount', 1);
  }

  /**
   * Получить шаблоны по каналу
   */
  async findByChannel(channel: QuickReplyChannel): Promise<QuickReply[]> {
    return this.quickRepliesRepository.find({
      where: [
        { channel, isActive: true },
        { channel: QuickReplyChannel.ALL, isActive: true },
      ],
      order: { usageCount: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Получить категории
   */
  async getCategories(channel?: QuickReplyChannel): Promise<string[]> {
    const queryBuilder = this.quickRepliesRepository
      .createQueryBuilder('quickReply')
      .select('DISTINCT quickReply.category', 'category')
      .where('quickReply.category IS NOT NULL');

    if (channel) {
      queryBuilder.andWhere(
        '(quickReply.channel = :channel OR quickReply.channel = :all)',
        { channel, all: QuickReplyChannel.ALL },
      );
    }

    const results = await queryBuilder.getRawMany();
    return results.map((r) => r.category).filter((c) => c);
  }
}

