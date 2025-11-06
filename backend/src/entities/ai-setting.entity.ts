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
import { Client } from './client.entity';

export enum AiProvider {
  OPENAI = 'openai',
  YANDEX_GPT = 'yandex_gpt',
}

@Entity('ai_settings')
@Index(['clientId'])
@Index(['isEnabled'])
export class AiSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @ManyToOne(() => Client, (client) => client.aiSettings)
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({ type: 'boolean', default: false })
  isEnabled: boolean;

  @Column({ type: 'varchar', length: 50, default: AiProvider.OPENAI })
  provider: AiProvider;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string; // gpt-4, yandexgpt, etc.

  @Column({ type: 'text', nullable: true })
  systemPrompt: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.7 })
  temperature: number;

  @Column({ type: 'int', nullable: true })
  maxTokens: number;

  @Column({ type: 'int', default: 0 })
  tokensUsed: number; // счетчик использованных токенов

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>; // дополнительные настройки

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
