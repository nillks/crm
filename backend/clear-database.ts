import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '.env') });

async function clearDatabase() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'crm_db',
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Получаем список всех таблиц
    const queryRunner = dataSource.createQueryRunner();
    
    console.log('🗑️  Starting database cleanup...');
    
    // Удаляем данные из всех таблиц в правильном порядке (с учетом внешних ключей)
    // Порядок важен: сначала зависимые таблицы, затем основные
    const tables = [
      'transfer_history',  // Зависит от tickets, users
      'comments',          // Зависит от tickets, users
      'tasks',             // Зависит от tickets, users
      'call_logs',         // Зависит от calls
      'calls',             // Зависит от clients, users
      'messages',          // Зависит от clients, tickets
      'tickets',           // Зависит от clients, users
      'clients',           // Зависит от users (опционально)
      'quick_replies',     // Зависит от users
      'ai_settings',       // Зависит от users
      'users',             // Зависит от roles
      'roles',             // Базовая таблица
      'media_files',       // Базовая таблица
    ];

    for (const table of tables) {
      try {
        // Используем TRUNCATE CASCADE для автоматического удаления зависимых записей
        await queryRunner.query(`TRUNCATE TABLE "${table}" CASCADE;`);
        console.log(`✅ Cleared table: ${table}`);
      } catch (error: any) {
        // Если TRUNCATE не работает, пробуем DELETE
        try {
          const result = await queryRunner.query(`DELETE FROM "${table}";`);
          console.log(`✅ Cleared table: ${table} (${result[1] || 0} rows)`);
        } catch (deleteError: any) {
          console.error(`❌ Error clearing table ${table}:`, deleteError.message);
        }
      }
    }
    
    console.log('✅ Database cleanup completed successfully!');
    console.log('📝 All tables have been cleared. You can now test with fresh data.');
    
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('✅ Database connection closed');
    }
  }
}

// Запускаем очистку
clearDatabase()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

