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
import { User } from './user.entity';
import { Client } from './client.entity';
import { Comment } from './comment.entity';
import { Message } from './message.entity';
import { TransferHistory } from './transfer-history.entity';
import { FunnelStage } from './funnel-stage.entity';
import { SupportLine } from './support-line.entity';

export enum TicketStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  CLOSED = 'closed',
  OVERDUE = 'overdue',
}

export enum TicketChannel {
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  INSTAGRAM = 'instagram',
  CALL = 'call',
}

export enum TicketCategory {
  TECHNICAL = 'technical', // Техническая поддержка
  SALES = 'sales', // Продажи
  COMPLAINT = 'complaint', // Жалоба
  QUESTION = 'question', // Вопрос
  REQUEST = 'request', // Запрос
  OTHER = 'other', // Другое
}

@Entity('tickets')
@Index(['status'])
@Index(['channel'])
@Index(['category'])
@Index(['funnelStageId'])
@Index(['clientId'])
@Index(['assignedToId'])
@Index(['createdAt'])
@Index(['updatedAt'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @ManyToOne(() => Client, (client) => client.tickets)
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({ type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, (user) => user.createdTickets)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ type: 'uuid', nullable: true })
  assignedToId: string;

  @ManyToOne(() => User, (user) => user.assignedTickets)
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User;

  @Column({ type: 'varchar', length: 50, default: TicketStatus.NEW })
  status: TicketStatus;

  @Column({ type: 'varchar', length: 50 })
  channel: TicketChannel;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: TicketCategory; // Категория тикета

  @Column({ type: 'uuid', nullable: true })
  funnelStageId: string; // Текущий этап воронки

  @ManyToOne(() => FunnelStage, (stage) => stage.tickets, { nullable: true })
  @JoinColumn({ name: 'funnelStageId' })
  funnelStage: FunnelStage;

  @Column({ type: 'uuid', nullable: true })
  supportLineId: string; // Линия поддержки, на которую назначен тикет

  @ManyToOne(() => SupportLine, (line) => line.tickets, { nullable: true })
  @JoinColumn({ name: 'supportLineId' })
  supportLine: SupportLine;

  @Column({ type: 'int', default: 0 })
  priority: number; // 0-5, где 5 - наивысший приоритет

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Comment, (comment) => comment.ticket)
  comments: Comment[];

  @OneToMany(() => Message, (message) => message.ticket)
  messages: Message[];

  @OneToMany(() => TransferHistory, (transfer) => transfer.ticket)
  transferHistory: TransferHistory[];
}
