import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { User } from './user.entity';

@Entity('transfer_history')
@Index(['ticketId'])
@Index(['fromUserId'])
@Index(['toUserId'])
@Index(['createdAt'])
export class TransferHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  ticketId: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.transferHistory)
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @Column({ type: 'uuid' })
  fromUserId: string;

  @ManyToOne(() => User, (user) => user.transfersFrom)
  @JoinColumn({ name: 'fromUserId' })
  fromUser: User;

  @Column({ type: 'uuid' })
  toUserId: string;

  @ManyToOne(() => User, (user) => user.transfersTo)
  @JoinColumn({ name: 'toUserId' })
  toUser: User;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;
}
