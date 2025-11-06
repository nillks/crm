import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { Message } from './message.entity';
import { Call } from './call.entity';
import { Task } from './task.entity';
import { MediaFile } from './media-file.entity';
import { AiSetting } from './ai-setting.entity';

@Entity('clients')
@Index(['phone'])
@Index(['email'])
@Index(['status'])
@Index(['createdAt'])
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telegramId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  whatsappId: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  instagramId: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: string; // active, inactive, blocked

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Ticket, (ticket) => ticket.client)
  tickets: Ticket[];

  @OneToMany(() => Message, (message) => message.client)
  messages: Message[];

  @OneToMany(() => Call, (call) => call.client)
  calls: Call[];

  @OneToMany(() => Task, (task) => task.client)
  tasks: Task[];

  @OneToMany(() => MediaFile, (file) => file.client)
  mediaFiles: MediaFile[];

  @OneToMany(() => AiSetting, (setting) => setting.client)
  aiSettings: AiSetting[];
}
