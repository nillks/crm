#!/usr/bin/env ts-node
/**
 * Скрипт для очистки сообщений WhatsApp из БД
 * Использование: npx ts-node clear-whatsapp-messages.ts
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { AllEntities } from './src/entities';

config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'crm_db',
  entities: AllEntities,
  synchronize: false,
  logging: false,
});

async function clearWhatsAppMessages() {
  try {
    console.log('🔌 Подключение к БД...');
    await dataSource.initialize();
    console.log('✅ Подключено к БД');

    // Подсчитываем сообщения перед удалением
    const countResult = await dataSource.query(
      "SELECT COUNT(*) as count FROM messages WHERE channel = 'whatsapp'"
    );
    const count = parseInt(countResult[0].count);

    console.log(`\n📊 Найдено сообщений WhatsApp: ${count}`);

    if (count === 0) {
      console.log('✅ Сообщений WhatsApp в БД нет');
      await dataSource.destroy();
      return;
    }

    // Удаляем все сообщения WhatsApp
    const deleteResult = await dataSource.query(
      "DELETE FROM messages WHERE channel = 'whatsapp'"
    );

    console.log(`\n🗑️  Удалено сообщений: ${count}`);

    // Проверяем, что удаление прошло успешно
    const remainingResult = await dataSource.query(
      "SELECT COUNT(*) as count FROM messages WHERE channel = 'whatsapp'"
    );
    const remainingCount = parseInt(remainingResult[0].count);

    if (remainingCount === 0) {
      console.log('✅ Все сообщения WhatsApp успешно удалены');
    } else {
      console.log(`⚠️  Осталось сообщений: ${remainingCount}`);
    }

    await dataSource.destroy();
    console.log('\n✅ Готово!');
  } catch (error) {
    console.error('❌ Ошибка:', error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

clearWhatsAppMessages();

