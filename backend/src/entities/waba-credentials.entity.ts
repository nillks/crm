import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('waba_credentials')
export class WABACredentials {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  accessToken: string; // Зашифрованный токен доступа

  @Column({ type: 'varchar', length: 255 })
  phoneNumberId: string; // ID номера телефона в Facebook

  @Column({ type: 'varchar', length: 255 })
  businessAccountId: string; // ID бизнес-аккаунта в Facebook

  @Column({ type: 'varchar', length: 255, nullable: true })
  appId: string; // ID приложения в Facebook

  @Column({ type: 'varchar', length: 255, nullable: true })
  appSecret: string; // Зашифрованный секрет приложения

  @Column({ type: 'varchar', length: 255, nullable: true })
  webhookVerifyToken: string; // Токен для верификации webhook

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // Дополнительные метаданные

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

