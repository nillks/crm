import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { User } from './user.entity';
import { CallLog } from './call-log.entity';

export enum CallType {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum CallStatus {
  RINGING = 'ringing',
  ANSWERED = 'answered',
  MISSED = 'missed',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('calls')
@Index(['clientId'])
@Index(['operatorId'])
@Index(['status'])
@Index(['type'])
@Index(['createdAt'])
export class Call {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  type: CallType;

  @Column({ type: 'varchar', length: 50 })
  status: CallStatus;

  @Column({ type: 'varchar', length: 20 })
  phoneNumber: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @ManyToOne(() => Client, (client) => client.calls)
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({ type: 'uuid', nullable: true })
  operatorId: string;

  @ManyToOne(() => User, (user) => user.calls)
  @JoinColumn({ name: 'operatorId' })
  operator: User;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalId: string; // ID звонка из АТС

  @Column({ type: 'int', nullable: true })
  duration: number; // в секундах

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @OneToMany(() => CallLog, (log) => log.call)
  logs: CallLog[];
}
