import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { User } from './user.entity';
import { AiProvider } from './ai-setting.entity';

@Entity('ai_logs')
@Index(['clientId'])
@Index(['userId'])
@Index(['provider'])
@Index(['createdAt'])
export class AiLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  clientId: string;

  @ManyToOne(() => Client, { nullable: true })
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 50 })
  provider: AiProvider;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string;

  @Column({ type: 'text' })
  request: string; // Запрос пользователя

  @Column({ type: 'text' })
  response: string; // Ответ AI

  @Column({ type: 'text', nullable: true })
  systemPrompt: string; // Использованный системный промпт

  @Column({ type: 'int', default: 0 })
  tokensUsed: number; // Количество использованных токенов

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  temperature: number; // Температура генерации

  @Column({ type: 'int', nullable: true })
  maxTokens: number; // Максимальное количество токенов

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Дополнительные метаданные (usage, timing, etc.)

  @Column({ type: 'boolean', default: true })
  success: boolean; // Успешность запроса

  @Column({ type: 'text', nullable: true })
  error: string; // Сообщение об ошибке, если запрос не удался

  @CreateDateColumn()
  createdAt: Date;
}

