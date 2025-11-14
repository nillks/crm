import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { AllEntities } from '../entities';

config();

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
