import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Funnel } from '../entities/funnel.entity';
import { FunnelStage } from '../entities/funnel-stage.entity';
import { Ticket } from '../entities/ticket.entity';
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
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
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

  /**
   * Получить статистику по воронке
   */
  async getFunnelStats(funnelId: string, startDate?: Date, endDate?: Date): Promise<{
    funnelId: string;
    funnelName: string;
    stages: {
      stageId: string;
      stageName: string;
      ticketCount: number;
      percentage: number;
    }[];
    totalTickets: number;
    conversionRate: number;
  }> {
    const funnel = await this.findOne(funnelId);
    const stages = await this.findStagesByFunnel(funnelId);

    // Подсчитываем тикеты по этапам
    const stageStats = await Promise.all(
      stages.map(async (stage) => {
        const where: any = { funnelStageId: stage.id };
        if (startDate && endDate) {
          where.createdAt = Between(startDate, endDate);
        } else if (startDate) {
          where.createdAt = MoreThanOrEqual(startDate);
        } else if (endDate) {
          where.createdAt = LessThanOrEqual(endDate);
        }

        const ticketCount = await this.ticketsRepository.count({ where });
        return {
          stageId: stage.id,
          stageName: stage.name,
          ticketCount,
          percentage: 0, // Будет вычислено ниже
        };
      }),
    );

    const totalTickets = stageStats.reduce((sum, stat) => sum + stat.ticketCount, 0);

    // Вычисляем проценты
    const stageStatsWithPercentages = stageStats.map((stat) => ({
      ...stat,
      percentage: totalTickets > 0 ? (stat.ticketCount / totalTickets) * 100 : 0,
    }));

    // Вычисляем конверсию (отношение финальных этапов к начальным)
    const firstStage = stages.find((s) => s.order === Math.min(...stages.map((st) => st.order)));
    const finalStages = stages.filter((s) => s.isFinal);
    
    const firstStageTickets = firstStage
      ? await this.ticketsRepository.count({
          where: { funnelStageId: firstStage.id },
        })
      : 0;
    
    const finalStageTickets = finalStages.length > 0
      ? await this.ticketsRepository.count({
          where: { funnelStageId: finalStages.map((s) => s.id) as any },
        })
      : 0;
    
    const conversionRate = firstStageTickets > 0 ? (finalStageTickets / firstStageTickets) * 100 : 0;

    return {
      funnelId: funnel.id,
      funnelName: funnel.name,
      stages: stageStatsWithPercentages,
      totalTickets,
      conversionRate,
    };
  }
}

