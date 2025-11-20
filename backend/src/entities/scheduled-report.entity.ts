import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum ScheduleFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum ReportType {
  TICKETS = 'tickets',
  CALLS = 'calls',
  OPERATORS = 'operators',
  CLIENTS = 'clients',
}

export enum ReportFormat {
  EXCEL = 'excel',
  PDF = 'pdf',
}

@Entity('scheduled_reports')
@Index(['userId'])
@Index(['isActive'])
@Index(['nextRunAt'])
export class ScheduledReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 100 })
  name: string; // Название расписания

  @Column({ type: 'enum', enum: ReportType })
  reportType: ReportType;

  @Column({ type: 'enum', enum: ReportFormat })
  format: ReportFormat;

  @Column({ type: 'enum', enum: ScheduleFrequency })
  frequency: ScheduleFrequency; // daily, weekly, monthly

  @Column({ type: 'time', nullable: true })
  time: string; // Время отправки (например, "09:00")

  @Column({ type: 'int', nullable: true })
  dayOfWeek: number; // День недели для weekly (0-6, где 0 = воскресенье)

  @Column({ type: 'int', nullable: true })
  dayOfMonth: number; // День месяца для monthly (1-31)

  @Column({ type: 'varchar', length: 255, nullable: true })
  telegramChatId: string; // Telegram chat ID для отправки

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string; // Email для отправки

  @Column({ type: 'jsonb', nullable: true })
  fields: string[]; // Выбранные поля для отчёта

  @Column({ type: 'jsonb', nullable: true })
  filters: {
    startDate?: string;
    endDate?: string;
    [key: string]: any;
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  nextRunAt: Date; // Следующий запуск

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt: Date; // Последний запуск

  @Column({ type: 'int', default: 0 })
  runCount: number; // Количество запусков

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

