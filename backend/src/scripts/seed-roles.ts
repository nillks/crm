import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import { Role, RoleName } from '../entities/role.entity';

config({ path: path.resolve(process.cwd(), '.env') });

async function seedRoles() {
  // Парсим DATABASE_URL если он есть
  let dbConfig: any = {
    type: 'postgres' as const,
    entities: [Role],
    synchronize: false,
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
    console.log('✅ Подключение к БД успешно\n');

    const roleRepository = dataSource.getRepository(Role);
    
    // Проверяем существующие роли
    const existingRoles = await roleRepository.find();
    console.log(`📊 Найдено ролей в БД: ${existingRoles.length}\n`);

    if (existingRoles.length > 0) {
      console.log('Текущие роли:');
      existingRoles.forEach((role) => {
        console.log(`  - ${role.name} (ID: ${role.id})`);
      });
      console.log('');
    }

    // Создаем роли, если их нет
    const rolesToCreate = [
      { name: RoleName.ADMIN, description: 'Администратор/директор - полный доступ' },
      { name: RoleName.OPERATOR1, description: 'Оператор линии №1' },
      { name: RoleName.OPERATOR2, description: 'Оператор линии №2' },
      { name: RoleName.OPERATOR3, description: 'Оператор линии №3' },
    ];

    let createdCount = 0;
    for (const roleData of rolesToCreate) {
      const existing = await roleRepository.findOne({
        where: { name: roleData.name },
      });

      if (!existing) {
        const role = roleRepository.create(roleData);
        await roleRepository.save(role);
        console.log(`✅ Создана роль: ${roleData.name} (ID: ${role.id})`);
        createdCount++;
      } else {
        console.log(`⏭️  Роль уже существует: ${roleData.name}`);
      }
    }

    if (createdCount > 0) {
      console.log(`\n✅ Создано новых ролей: ${createdCount}`);
    } else {
      console.log(`\n✅ Все роли уже существуют в БД`);
    }

    // Выводим финальный список
    const allRoles = await roleRepository.find();
    console.log(`\n📋 Всего ролей в БД: ${allRoles.length}`);
    console.log('\nРоли для использования при регистрации:');
    allRoles.forEach((role) => {
      console.log(`  - ${role.name}: ${role.id}`);
    });

    await dataSource.destroy();
    console.log('\n✅ Готово!');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

seedRoles();
