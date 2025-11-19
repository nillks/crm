import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QuickRepliesService } from './quick-replies.service';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';
import { FilterQuickRepliesDto } from './dto/filter-quick-replies.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QuickReplyChannel } from '../entities/quick-reply.entity';

@Controller('quick-replies')
@UseGuards(JwtAuthGuard)
export class QuickRepliesController {
  constructor(private readonly quickRepliesService: QuickRepliesService) {}

  /**
   * Создать шаблон
   * POST /quick-replies
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateQuickReplyDto) {
    return this.quickRepliesService.create(createDto);
  }

  /**
   * Получить все шаблоны с фильтрами
   * GET /quick-replies?channel=...&category=...&isActive=...
   */
  @Get()
  async findAll(@Query() filterDto: FilterQuickRepliesDto) {
    return this.quickRepliesService.findAll(filterDto);
  }

  /**
   * Получить шаблон по ID
   * GET /quick-replies/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.quickRepliesService.findOne(id);
  }

  /**
   * Обновить шаблон
   * PUT /quick-replies/:id
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateQuickReplyDto) {
    return this.quickRepliesService.update(id, updateDto);
  }

  /**
   * Удалить шаблон
   * DELETE /quick-replies/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.quickRepliesService.remove(id);
  }

  /**
   * Получить шаблоны по каналу
   * GET /quick-replies/channel/:channel
   */
  @Get('channel/:channel')
  async findByChannel(@Param('channel') channel: QuickReplyChannel) {
    return this.quickRepliesService.findByChannel(channel);
  }

  /**
   * Получить категории
   * GET /quick-replies/categories?channel=...
   */
  @Get('categories')
  async getCategories(@Query('channel') channel?: QuickReplyChannel) {
    return this.quickRepliesService.getCategories(channel);
  }

  /**
   * Увеличить счетчик использования
   * POST /quick-replies/:id/use
   */
  @Post(':id/use')
  @HttpCode(HttpStatus.NO_CONTENT)
  async incrementUsage(@Param('id') id: string) {
    await this.quickRepliesService.incrementUsage(id);
  }
}

