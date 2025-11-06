import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Call } from './call.entity';

@Entity('call_logs')
@Index(['callId'])
@Index(['createdAt'])
export class CallLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  callId: string;

  @ManyToOne(() => Call, (call) => call.logs)
  @JoinColumn({ name: 'callId' })
  call: Call;

  @Column({ type: 'varchar', length: 255, nullable: true })
  recordingUrl: string;

  @Column({ type: 'text', nullable: true })
  transcription: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
