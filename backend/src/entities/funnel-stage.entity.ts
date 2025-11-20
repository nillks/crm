import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Funnel } from './funnel.entity';
import { Ticket } from './ticket.entity';

@Entity('funnel_stages')
@Index(['funnelId'])
@Index(['order'])
export class FunnelStage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  funnelId: string;

  @ManyToOne(() => Funnel, (funnel) => funnel.stages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'funnelId' })
  funnel: Funnel;

  @Column({ type: 'varchar', length: 255 })
  name: string; // Название этапа

  @Column({ type: 'text', nullable: true })
  description: string; // Описание этапа

  @Column({ type: 'int' })
  order: number; // Порядок этапа в воронке

  @Column({ type: 'varchar', length: 50, nullable: true })
  ticketStatus: string; // Соответствующий статус тикета (new, in_progress, closed, overdue)

  @Column({ type: 'boolean', default: false })
  isFinal: boolean; // Финальный этап (закрытие тикета)

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // Активен ли этап

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Ticket, (ticket) => ticket.funnelStage)
  tickets: Ticket[];
}

