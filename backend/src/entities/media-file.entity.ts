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
import { Message } from './message.entity';

export enum MediaFileType {
  IMAGE = 'image',
  PDF = 'pdf',
  DOC = 'doc',
  DOCX = 'docx',
  AUDIO = 'audio',
  VIDEO = 'video',
  OTHER = 'other',
}

@Entity('media_files')
@Index(['clientId'])
@Index(['messageId'])
@Index(['type'])
@Index(['createdAt'])
export class MediaFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  fileName: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'varchar', length: 50 })
  type: MediaFileType;

  @Column({ type: 'bigint' })
  size: number; // размер в байтах

  @Column({ type: 'varchar', length: 500 })
  url: string; // URL файла в S3 или другом хранилище

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @ManyToOne(() => Client, (client) => client.mediaFiles)
  @JoinColumn({ name: 'clientId' })
  client: Client;

  @Column({ type: 'uuid', nullable: true })
  messageId: string;

  @ManyToOne(() => Message, (message) => message.mediaFiles)
  @JoinColumn({ name: 'messageId' })
  message: Message;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalId: string; // ID файла из внешней системы

  @CreateDateColumn()
  createdAt: Date;
}
