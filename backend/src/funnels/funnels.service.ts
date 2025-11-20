import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Funnel } from '../entities/funnel.entity';
import { FunnelStage } from '../entities/funnel-stage.entity';
import { CreateFunnelDto } from './dto/create-funnel.dto';
import { UpdateFunnelDto } from './dto/update-funnel.dto';
import { CreateFunnelStageDto } from './dto/create-funnel-stage.dto';
import { UpdateFunnelStageDto } from './dto/update-funnel-stage.dto';

@Injectable()
export class FunnelsService {
  constructor(
    @InjectRepository(Funnel)
    private funnelsRepository: Repository<Funnel>,
    @InjectRepository(FunnelStage)
    private stagesRepository: Repository<FunnelStage>,
  ) {}

  /**
   * Получить все воронки
   */
  async findAll(): Promise<Funnel[]> {
    return this.funnelsRepository.find({
      relations: ['stages'],
      order: { order: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * Получить активные воронки
   */
  async findActive(): Promise<Funnel[]> {
    return this.funnelsRepository.find({
      where: { isActive: true },
      relations: ['stages'],
      order: { order: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * Получить воронку по ID
   */
  async findOne(id: string): Promise<Funnel> {
    const funnel = await this.funnelsRepository.findOne({
      where: { id },
      relations: ['stages'],
    });

    if (!funnel) {
      throw new NotFoundException(`Воронка с ID ${id} не найдена`);
    }

    return funnel;
  }

  /**
   * Создать воронку
   */
  async create(createDto: CreateFunnelDto): Promise<Funnel> {
    const funnel = this.funnelsRepository.create({
      ...createDto,
      isActive: createDto.isActive ?? true,
      order: createDto.order ?? 0,
    });

    return this.funnelsRepository.save(funnel);
  }

  /**
   * Обновить воронку
   */
  async update(id: string, updateDto: UpdateFunnelDto): Promise<Funnel> {
    const funnel = await this.findOne(id);

    Object.assign(funnel, updateDto);
    return this.funnelsRepository.save(funnel);
  }

  /**
   * Удалить воронку
   */
  async remove(id: string): Promise<void> {
    const funnel = await this.findOne(id);
    await this.funnelsRepository.remove(funnel);
  }

  /**
   * Получить все этапы воронки
   */
  async findStagesByFunnel(funnelId: string): Promise<FunnelStage[]> {
    return this.stagesRepository.find({
      where: { funnelId },
      order: { order: 'ASC' },
    });
  }

  /**
   * Создать этап воронки
   */
  async createStage(createDto: CreateFunnelStageDto): Promise<FunnelStage> {
    // Проверяем существование воронки
    const funnel = await this.findOne(createDto.funnelId);

    const stage = this.stagesRepository.create({
      ...createDto,
      isActive: createDto.isActive ?? true,
      isFinal: createDto.isFinal ?? false,
    });

    return this.stagesRepository.save(stage);
  }

  /**
   * Обновить этап воронки
   */
  async updateStage(id: string, updateDto: UpdateFunnelStageDto): Promise<FunnelStage> {
    const stage = await this.stagesRepository.findOne({ where: { id } });

    if (!stage) {
      throw new NotFoundException(`Этап с ID ${id} не найден`);
    }

    // Если меняется воронка, проверяем её существование
    if (updateDto.funnelId) {
      await this.findOne(updateDto.funnelId);
    }

    Object.assign(stage, updateDto);
    return this.stagesRepository.save(stage);
  }

  /**
   * Удалить этап воронки
   */
  async removeStage(id: string): Promise<void> {
    const stage = await this.stagesRepository.findOne({ where: { id } });

    if (!stage) {
      throw new NotFoundException(`Этап с ID ${id} не найден`);
    }

    await this.stagesRepository.remove(stage);
  }

  /**
   * Получить этап по ID
   */
  async findStageById(id: string): Promise<FunnelStage> {
    const stage = await this.stagesRepository.findOne({
      where: { id },
      relations: ['funnel'],
    });

    if (!stage) {
      throw new NotFoundException(`Этап с ID ${id} не найден`);
    }

    return stage;
  }
}

