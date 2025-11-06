#!/bin/bash

# Скрипт для настройки PostgreSQL базы данных для CRM проекта

echo "🔧 Настройка PostgreSQL для CRM проекта..."

# Проверка наличия sudo
if ! command -v sudo &> /dev/null; then
    echo "❌ sudo не найден. Запустите скрипт с правами администратора."
    exit 1
fi

# Создание пользователя и базы данных
echo "📦 Создание пользователя и базы данных..."

sudo -u postgres psql << EOF
-- Создаем пользователя (если не существует)
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'crm_user') THEN
        CREATE USER crm_user WITH PASSWORD 'crm_password_2024';
    ELSE
        ALTER USER crm_user WITH PASSWORD 'crm_password_2024';
    END IF;
END
\$\$;

-- Создаем базу данных
SELECT 'CREATE DATABASE crm_db OWNER crm_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'crm_db')\gexec

-- Выдаем права
GRANT ALL PRIVILEGES ON DATABASE crm_db TO crm_user;

\q
EOF

if [ $? -eq 0 ]; then
    echo "✅ База данных успешно создана!"
    echo ""
    echo "📝 Обновите файл backend/.env со следующими значениями:"
    echo "DB_USERNAME=crm_user"
    echo "DB_PASSWORD=crm_password_2024"
    echo "DB_DATABASE=crm_db"
    echo ""
    echo "⚠️  ВНИМАНИЕ: Для production измените пароль на более надежный!"
else
    echo "❌ Ошибка при создании базы данных"
    exit 1
fi

