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
import { User } from './user.entity';

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  OVERDUE = 'overdue',
}

export enum TaskPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  URGENT = 4,
  CRITICAL = 5,
}

@Entity('tasks')
@Index(['clientId'])
@Index(['assignedToId'])
@Index(['status'])
@Index(['priority'])
@Index(['dueDate'])
@Index(['createdAt'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @ManyToOne(() => Client, (client) => client.tasks)
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({ type: 'uuid' })
  assignedToId: string;

  @ManyToOne(() => User, (user) => user.tasks)
  @JoinColumn({ name: 'assignedToId' })
  assignedTo: User;

  @Column({ type: 'varchar', length: 50, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column({ type: 'int', default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
