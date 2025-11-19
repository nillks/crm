import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { WABATemplate } from './waba-template.entity';
import { Client } from './client.entity';
import { User } from './user.entity';

export enum WABACampaignStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

@Entity('waba_campaigns')
@Index(['templateId'])
@Index(['clientId'])
@Index(['status'])
@Index(['scheduledAt'])
@Index(['createdAt'])
export class WABACampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  templateId: string;

  @ManyToOne(() => WABATemplate, (template) => template.campaigns)
  @JoinColumn({ name: 'templateId' })
  template: WABATemplate;

  @Column({ type: 'uuid' })
  clientId: string;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({ type: 'uuid', nullable: true })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ type: 'varchar', length: 50, default: WABACampaignStatus.PENDING })
  status: WABACampaignStatus;

  @Column({ type: 'jsonb' })
  parameters: Record<string, string>; // Параметры для подстановки в шаблон

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date; // Время отправки

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date; // Время фактической отправки

  @Column({ type: 'varchar', length: 255, nullable: true })
  facebookMessageId: string; // ID сообщения в Facebook

  @Column({ type: 'text', nullable: true })
  errorMessage: string; // Сообщение об ошибке, если отправка не удалась

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Дополнительные метаданные

  @CreateDateColumn()
  createdAt: Date;
}

