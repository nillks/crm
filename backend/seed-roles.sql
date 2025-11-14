-- SQL скрипт для сидирования ролей
-- Выполните этот скрипт напрямую в PostgreSQL

-- Проверяем и создаем роли, если их нет
INSERT INTO roles (id, name, description, "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(),
    'admin',
    'Администратор/директор - полный доступ',
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin');

INSERT INTO roles (id, name, description, "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(),
    'operator1',
    'Оператор линии №1',
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'operator1');

INSERT INTO roles (id, name, description, "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(),
    'operator2',
    'Оператор линии №2',
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'operator2');

INSERT INTO roles (id, name, description, "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(),
    'operator3',
    'Оператор линии №3',
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'operator3');

-- Выводим созданные роли
SELECT id, name, description FROM roles ORDER BY name;

