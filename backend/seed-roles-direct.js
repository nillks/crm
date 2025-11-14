// Прямой JavaScript скрипт для сидирования ролей
// Работает без TypeScript и ts-node
// Использование: node seed-roles-direct.js

const { Client } = require('pg');
const crypto = require('crypto');

// Простая функция генерации UUID v4
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL не установлен');
  process.exit(1);
}

const url = new URL(databaseUrl);
const client = new Client({
  host: url.hostname,
  port: parseInt(url.port) || 5432,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: url.hostname !== 'localhost' && url.hostname !== '127.0.0.1' ? { rejectUnauthorized: false } : false,
});

const roles = [
  { name: 'admin', description: 'Администратор/директор - полный доступ' },
  { name: 'operator1', description: 'Оператор линии №1' },
  { name: 'operator2', description: 'Оператор линии №2' },
  { name: 'operator3', description: 'Оператор линии №3' },
];

async function seedRoles() {
  try {
    await client.connect();
    console.log('✅ Подключение к БД успешно\n');

    let createdCount = 0;

    for (const roleData of roles) {
      // Проверяем существующую роль
      const checkResult = await client.query('SELECT id, name FROM roles WHERE name = $1', [roleData.name]);
      
      if (checkResult.rows.length > 0) {
        console.log(`⏭️  Роль уже существует: ${roleData.name} (ID: ${checkResult.rows[0].id})`);
      } else {
        const id = uuidv4();
        await client.query(
          'INSERT INTO roles (id, name, description, "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())',
          [id, roleData.name, roleData.description]
        );
        console.log(`✅ Создана роль: ${roleData.name} (ID: ${id})`);
        createdCount++;
      }
    }

    if (createdCount > 0) {
      console.log(`\n✅ Создано новых ролей: ${createdCount}`);
    } else {
      console.log(`\n✅ Все роли уже существуют в БД`);
    }

    // Выводим финальный список
    const allRoles = await client.query('SELECT id, name, description FROM roles ORDER BY name');
    console.log(`\n📋 Всего ролей в БД: ${allRoles.rows.length}`);
    console.log('\nРоли для использования при регистрации:');
    allRoles.rows.forEach((role) => {
      console.log(`  - ${role.name}: ${role.id}`);
    });

    await client.end();
    console.log('\n✅ Готово!');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    await client.end();
    process.exit(1);
  }
}

seedRoles();

