import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role, RoleName } from './role.entity';
import { Ticket } from './ticket.entity';
import { Comment } from './comment.entity';
import { Task } from './task.entity';
import { TransferHistory } from './transfer-history.entity';
import { Call } from './call.entity';
import { SupportLine } from './support-line.entity';

@Entity('users')
@Index(['email'])
@Index(['roleId'])
@Index(['status'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'uuid' })
  roleId: string;

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @Column({ type: 'uuid', nullable: true })
  supportLineId: string;

  @ManyToOne(() => SupportLine, (line) => line.operators, { nullable: true })
  @JoinColumn({ name: 'supportLineId' })
  supportLine: SupportLine;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: string; // active, inactive, blocked

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Ticket, (ticket) => ticket.assignedTo)
  assignedTickets: Ticket[];

  @OneToMany(() => Ticket, (ticket) => ticket.createdBy)
  createdTickets: Ticket[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];

  @OneToMany(() => Task, (task) => task.assignedTo)
  tasks: Task[];

  @OneToMany(() => TransferHistory, (transfer) => transfer.fromUser)
  transfersFrom: TransferHistory[];

  @OneToMany(() => TransferHistory, (transfer) => transfer.toUser)
  transfersTo: TransferHistory[];

  @OneToMany(() => Call, (call) => call.operator)
  calls: Call[];
}
