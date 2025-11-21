import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Funnel } from '../entities/funnel.entity';
import { FunnelStage } from '../entities/funnel-stage.entity';
import { Ticket } from '../entities/ticket.entity';
import { CreateFunnelDto, UpdateFunnelDto, CreateFunnelStageDto, UpdateFunnelStageDto } from './dto';

@Injectable()
export class FunnelsService {
  constructor(
    @InjectRepository(Funnel)
    private funnelsRepository: Repository<Funnel>,
    @InjectRepository(FunnelStage)
    private funnelStagesRepository: Repository<FunnelStage>,
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
  ) {}

  async findAll(): Promise<Funnel[]> {
    return this.funnelsRepository.find({
      relations: ['stages'],
      order: { order: 'ASC', createdAt: 'DESC' },
    });
  }

  async findActive(): Promise<Funnel[]> {
    return this.funnelsRepository.find({
      where: { isActive: true },
      relations: ['stages'],
      order: { order: 'ASC', createdAt: 'DESC' },
    });
  }

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

  async create(createFunnelDto: CreateFunnelDto): Promise<Funnel> {
    const funnel = this.funnelsRepository.create({
      ...createFunnelDto,
      isActive: createFunnelDto.isActive ?? true,
      order: createFunnelDto.order ?? 0,
    });

    return this.funnelsRepository.save(funnel);
  }

  async update(id: string, updateFunnelDto: UpdateFunnelDto): Promise<Funnel> {
    const funnel = await this.findOne(id);

    Object.assign(funnel, updateFunnelDto);

    return this.funnelsRepository.save(funnel);
  }

  async remove(id: string): Promise<void> {
    const funnel = await this.findOne(id);

    // Проверяем, есть ли тикеты в этой воронке
    const stageIds = funnel.stages.map(s => s.id);
    if (stageIds.length > 0) {
      const ticketsCount = await this.ticketsRepository.count({
        where: { funnelStageId: In(stageIds) },
      });

      if (ticketsCount > 0) {
        throw new BadRequestException('Невозможно удалить воронку, в которой есть тикеты');
      }
    }

    await this.funnelsRepository.remove(funnel);
  }

  async findStagesByFunnel(funnelId: string): Promise<FunnelStage[]> {
    await this.findOne(funnelId); // Проверяем существование воронки

    return this.funnelStagesRepository.find({
      where: { funnelId },
      order: { order: 'ASC' },
    });
  }

  async createStage(createStageDto: CreateFunnelStageDto): Promise<FunnelStage> {
    await this.findOne(createStageDto.funnelId); // Проверяем существование воронки

    const stage = this.funnelStagesRepository.create({
      ...createStageDto,
      isFinal: createStageDto.isFinal ?? false,
      isActive: createStageDto.isActive ?? true,
    });

    return this.funnelStagesRepository.save(stage);
  }

  async updateStage(id: string, updateStageDto: UpdateFunnelStageDto): Promise<FunnelStage> {
    const stage = await this.funnelStagesRepository.findOne({ where: { id } });

    if (!stage) {
      throw new NotFoundException(`Этап с ID ${id} не найден`);
    }

    if (updateStageDto.funnelId) {
      await this.findOne(updateStageDto.funnelId); // Проверяем существование воронки
    }

    Object.assign(stage, updateStageDto);

    return this.funnelStagesRepository.save(stage);
  }

  async removeStage(id: string): Promise<void> {
    const stage = await this.funnelStagesRepository.findOne({ where: { id } });

    if (!stage) {
      throw new NotFoundException(`Этап с ID ${id} не найден`);
    }

    // Проверяем, есть ли тикеты на этом этапе
    const ticketsCount = await this.ticketsRepository.count({
      where: { funnelStageId: id },
    });

    if (ticketsCount > 0) {
      throw new BadRequestException('Невозможно удалить этап, на котором есть тикеты');
    }

    await this.funnelStagesRepository.remove(stage);
  }

  async getFunnelStats(funnelId: string, startDate?: string, endDate?: string) {
    const funnel = await this.findOne(funnelId);

    const queryBuilder = this.ticketsRepository
      .createQueryBuilder('ticket')
      .where('ticket.funnelStageId IN (:...stageIds)', {
        stageIds: funnel.stages.map(s => s.id),
      });

    if (startDate) {
      queryBuilder.andWhere('ticket.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('ticket.createdAt <= :endDate', { endDate });
    }

    const tickets = await queryBuilder.getMany();

    const totalTickets = tickets.length;
    const stageStats = funnel.stages.map(stage => {
      const stageTickets = tickets.filter(t => t.funnelStageId === stage.id);
      return {
        stageId: stage.id,
        stageName: stage.name,
        ticketCount: stageTickets.length,
        percentage: totalTickets > 0 ? (stageTickets.length / totalTickets) * 100 : 0,
      };
    });

    const completedTickets = tickets.filter(t => {
      const stage = funnel.stages.find(s => s.id === t.funnelStageId);
      return stage?.isFinal;
    });

    return {
      funnelId: funnel.id,
      funnelName: funnel.name,
      stages: stageStats,
      totalTickets,
      conversionRate: totalTickets > 0 ? (completedTickets.length / totalTickets) * 100 : 0,
    };
  }
}

