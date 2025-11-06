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
import { Ticket } from './ticket.entity';
import { MediaFile } from './media-file.entity';

export enum MessageChannel {
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  INSTAGRAM = 'instagram',
}

export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

@Entity('messages')
@Index(['clientId'])
@Index(['ticketId'])
@Index(['channel'])
@Index(['direction'])
@Index(['createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  channel: MessageChannel;

  @Column({ type: 'varchar', length: 50 })
  direction: MessageDirection;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalId: string; // ID сообщения из внешней системы (WhatsApp, Telegram, etc.)

  @Column({ type: 'uuid' })
  clientId: string;

  @ManyToOne(() => Client, (client) => client.messages)
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({ type: 'uuid', nullable: true })
  ticketId: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.messages)
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'boolean', default: false })
  isDelivered: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @OneToMany(() => MediaFile, (file) => file.message)
  mediaFiles: MediaFile[];
}
