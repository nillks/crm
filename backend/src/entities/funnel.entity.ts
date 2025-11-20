import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FunnelStage } from './funnel-stage.entity';

@Entity('funnels')
@Index(['name'])
export class Funnel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string; // Название воронки

  @Column({ type: 'text', nullable: true })
  description: string; // Описание воронки

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // Активна ли воронка

  @Column({ type: 'int', default: 0 })
  order: number; // Порядок сортировки

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => FunnelStage, (stage) => stage.funnel, { cascade: true })
  stages: FunnelStage[];
}

