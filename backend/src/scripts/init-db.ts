import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Импортируем все entities напрямую
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Client } from '../entities/client.entity';
import { Ticket } from '../entities/ticket.entity';
import { Message } from '../entities/message.entity';
import { Comment } from '../entities/comment.entity';
import { Task } from '../entities/task.entity';
import { TransferHistory } from '../entities/transfer-history.entity';
import { Call } from '../entities/call.entity';
import { CallLog } from '../entities/call-log.entity';
import { QuickReply } from '../entities/quick-reply.entity';
import { AiSetting } from '../entities/ai-setting.entity';
import { MediaFile } from '../entities/media-file.entity';

const AllEntities = [
  User,
  Role,
  Client,
  Ticket,
  Message,
  Comment,
  Task,
  TransferHistory,
  Call,
  CallLog,
  QuickReply,
  AiSetting,
  MediaFile,
];

config({ path: path.resolve(process.cwd(), '.env') });

async function initDatabase() {
  // Парсим DATABASE_URL если он есть
  let dbConfig: any = {
    type: 'postgres' as const,
    entities: AllEntities,
    synchronize: true, // Создаем таблицы
    logging: true,
  };

  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    dbConfig = {
      ...dbConfig,
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      username: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Убираем первый слэш
      ssl: url.hostname !== 'localhost' && url.hostname !== '127.0.0.1' ? { rejectUnauthorized: false } : false,
    };
  } else {
    dbConfig = {
      ...dbConfig,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'crm_db',
    };
  }

  const dataSource = new DataSource(dbConfig);

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');
    
    // Синхронизация создаст все таблицы
    await dataSource.synchronize();
    console.log('✅ Tables synchronized');
    
    await dataSource.destroy();
    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase();
