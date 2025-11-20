import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Ticket } from './ticket.entity';

@Entity('support_lines')
@Index(['name'])
@Index(['isActive'])
export class SupportLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string; // Название линии (например, "Линия поддержки №1")

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string; // Код линии (operator1, operator2, operator3)

  @Column({ type: 'text', nullable: true })
  description: string; // Описание линии

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // Активна ли линия

  @Column({ type: 'int', default: 0 })
  maxOperators: number; // Максимальное количество операторов на линии

  @Column({ type: 'jsonb', nullable: true })
  settings: {
    autoAssign?: boolean; // Автоматическое назначение тикетов
    roundRobin?: boolean; // Распределение по round-robin
    priority?: number; // Приоритет линии
    workingHours?: {
      enabled: boolean;
      timezone?: string;
      weekdays?: number[];
      startTime?: string;
      endTime?: string;
    };
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => User, (user) => user.supportLine)
  operators: User[];

  @OneToMany(() => Ticket, (ticket) => ticket.supportLine)
  tickets: Ticket[];
}

