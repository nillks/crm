import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { WABACampaign } from './waba-campaign.entity';

export enum WABATemplateStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAUSED = 'paused',
}

export enum WABATemplateCategory {
  MARKETING = 'MARKETING',
  UTILITY = 'UTILITY',
  AUTHENTICATION = 'AUTHENTICATION',
}

export enum WABATemplateComponentType {
  HEADER = 'HEADER',
  BODY = 'BODY',
  FOOTER = 'FOOTER',
  BUTTONS = 'BUTTONS',
}

@Entity('waba_templates')
@Index(['status'])
@Index(['category'])
@Index(['createdAt'])
export class WABATemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string; // Имя шаблона (уникальное)

  @Column({ type: 'varchar', length: 50 })
  category: WABATemplateCategory;

  @Column({ type: 'varchar', length: 50, default: WABATemplateStatus.PENDING })
  status: WABATemplateStatus;

  @Column({ type: 'text', nullable: true })
  language: string; // Код языка (например, 'ru', 'en')

  @Column({ type: 'jsonb' })
  components: Array<{
    type: WABATemplateComponentType;
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    text?: string;
    example?: {
      header_text?: string[];
      body_text?: string[][];
    };
    buttons?: Array<{
      type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
      text: string;
      url?: string;
      phone_number?: string;
    }>;
  }>;

  @Column({ type: 'varchar', length: 100, nullable: true })
  facebookTemplateId: string; // ID шаблона в Facebook

  @Column({ type: 'text', nullable: true })
  rejectionReason: string; // Причина отклонения

  @Column({ type: 'int', default: 0 })
  usageCount: number; // Количество использований

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Дополнительные метаданные

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => WABACampaign, (campaign) => campaign.template)
  campaigns: WABACampaign[];
}

