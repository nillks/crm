# Инструкция по деплою CRM приложения

## 🚀 Варианты деплоя

### Вариант 1: Быстрый деплой на VPS (рекомендуется для демо)

**Требования:**
- VPS с Ubuntu 20.04+ (минимум 2GB RAM, 1 CPU)
- Доменное имя (опционально, можно использовать IP)
- SSH доступ к серверу

#### Шаг 1: Подготовка сервера

```bash
# Подключитесь к серверу
ssh root@your-server-ip

# Обновление системы
apt update && apt upgrade -y

# Установка Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Установка PostgreSQL
apt install -y postgresql postgresql-contrib

# Установка Nginx
apt install -y nginx

# Установка PM2 для управления процессами
npm install -g pm2
```

#### Шаг 2: Настройка PostgreSQL

```bash
# Переключитесь на пользователя postgres
sudo -u postgres psql

# В PostgreSQL консоли:
CREATE DATABASE crm_db;
CREATE USER crm_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE crm_db TO crm_user;
\q
```

#### Шаг 3: Клонирование и сборка проекта

```bash
# Создайте директорию для приложения
mkdir -p /var/www/crm
cd /var/www/crm

# Клонируйте репозиторий (или загрузите файлы)
git clone https://your-repo-url.git .
# ИЛИ загрузите файлы через scp/sftp

# Установка зависимостей
npm install

# Сборка backend
cd backend
npm install
npm run build

# Сборка frontend
cd ../frontend
npm install
npm run build
```

#### Шаг 4: Настройка переменных окружения

```bash
# Backend .env
cd /var/www/crm/backend
nano .env
```

**Содержимое `backend/.env`:**
```env
# Server
NODE_ENV=production
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=crm_user
DB_PASSWORD=your_secure_password
DB_DATABASE=crm_db

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=https://your-domain.com,http://your-domain.com

# WhatsApp (Green API)
WHATSAPP_API_URL=https://7107.api.green-api.com
WHATSAPP_ID_INSTANCE=7107377559
WHATSAPP_API_TOKEN_INSTANCE=a740416956ee4ddcae7cc4396e1773fb035958cba4284127a8

# Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Instagram (Chatrace)
INSTAGRAM_API_URL=https://api.chatrace.com
INSTAGRAM_ACCESS_TOKEN=1543616.9NzKE301G8dmBBDxnJtACY1YXnDXFJ2HF
INSTAGRAM_USE_CHATRACE=true
INSTAGRAM_USE_MOCK=false
```

**Frontend .env:**
```bash
cd /var/www/crm/frontend
nano .env
```

**Содержимое `frontend/.env`:**
```env
VITE_API_URL=https://your-domain.com/api
# ИЛИ если без домена:
# VITE_API_URL=http://your-server-ip:3000
```

#### Шаг 5: Инициализация базы данных

```bash
cd /var/www/crm/backend

# Запустите миграции (если есть)
npm run migration:run

# Заполните роли
npm run seed:roles
```

#### Шаг 6: Запуск backend с PM2

```bash
cd /var/www/crm/backend

# Создайте ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'crm-backend',
    script: 'dist/main.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
EOF

# Создайте директорию для логов
mkdir -p logs

# Запустите приложение
pm2 start ecosystem.config.js

# Сохраните конфигурацию PM2
pm2 save
pm2 startup
```

#### Шаг 7: Настройка Nginx

```bash
# Создайте конфигурацию для Nginx
cat > /etc/nginx/sites-available/crm << EOF
# Backend API
server {
    listen 80;
    server_name your-domain.com api.your-domain.com;

    # Редирект на HTTPS (если есть SSL)
    # return 301 https://\$server_name\$request_uri;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Frontend
    location / {
        root /var/www/crm/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        index index.html;
    }
}
EOF

# Активируйте конфигурацию
ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Проверьте конфигурацию
nginx -t

# Перезапустите Nginx
systemctl restart nginx
```

#### Шаг 8: Настройка SSL (опционально, но рекомендуется)

```bash
# Установка Certbot
apt install -y certbot python3-certbot-nginx

# Получение SSL сертификата
certbot --nginx -d your-domain.com -d api.your-domain.com

# Автоматическое обновление
certbot renew --dry-run
```

#### Шаг 9: Настройка firewall

```bash
# Разрешить HTTP, HTTPS и SSH
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

#### Шаг 10: Настройка webhook'ов для production

**WhatsApp (Green API):**
1. Войдите в https://console.green-api.com/instanceList
2. Настройте webhook URL: `https://your-domain.com/api/whatsapp/webhook`

**Instagram (Chatrace):**
1. Войдите в https://chatrace.com/en/settings?acc=1543616
2. Настройте webhook URL: `https://your-domain.com/api/instagram/webhook`

**Telegram:**
- Webhook настраивается автоматически при первом запуске бота

---

### Вариант 2: Деплой на Railway (простой, бесплатный план)

**Railway** - простой способ деплоя с автоматическим деплоем из Git.

#### Шаг 1: Подготовка

1. Зарегистрируйтесь на https://railway.app
2. Подключите GitHub репозиторий

#### Шаг 2: Деплой Backend

1. Создайте новый проект в Railway
2. Добавьте PostgreSQL сервис
3. Добавьте сервис из GitHub (backend)
4. Настройте переменные окружения:
   - Все переменные из `backend/.env`
   - `DATABASE_URL` из PostgreSQL сервиса
5. Настройте команду запуска: `npm run start:prod`
6. Настройте порт: `3000`

#### Шаг 3: Деплой Frontend

1. Добавьте новый сервис из GitHub (frontend)
2. Настройте переменные окружения:
   - `VITE_API_URL=https://your-backend-url.railway.app/api`
3. Настройте команду сборки: `npm run build`
4. Настройте команду запуска: `npx serve -s dist -l 3000`
5. Настройте порт: `3000`

#### Шаг 4: Настройка домена

1. В настройках каждого сервиса добавьте кастомный домен
2. Обновите `CORS_ORIGIN` и `VITE_API_URL` с новыми доменами

---

### Вариант 3: Деплой на Render (бесплатный план)

#### Шаг 1: Подготовка

1. Зарегистрируйтесь на https://render.com
2. Подключите GitHub репозиторий

#### Шаг 2: Деплой Backend

1. Создайте новый **Web Service**
2. Подключите репозиторий
3. Настройки:
   - **Build Command:** `cd backend && npm install && npm run build`
   - **Start Command:** `cd backend && npm run start:prod`
   - **Environment:** Node
   - **Node Version:** 20
4. Добавьте PostgreSQL базу данных
5. Настройте переменные окружения (все из `backend/.env`)
6. Добавьте `DATABASE_URL` из PostgreSQL сервиса

#### Шаг 3: Деплой Frontend

1. Создайте новый **Static Site**
2. Подключите репозиторий
3. Настройки:
   - **Build Command:** `cd frontend && npm install && npm run build`
   - **Publish Directory:** `frontend/dist`
4. Настройте переменные окружения:
   - `VITE_API_URL=https://your-backend-url.onrender.com/api`

---

### Вариант 4: Docker деплой (для продвинутых)

#### Шаг 1: Создайте Dockerfile для backend

```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

#### Шаг 2: Создайте Dockerfile для frontend

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Шаг 3: Создайте docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: crm_db
      POSTGRES_USER: crm_user
      POSTGRES_PASSWORD: your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USERNAME=crm_user
      - DB_PASSWORD=your_secure_password
      - DB_DATABASE=crm_db
      # ... остальные переменные
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

#### Шаг 4: Запуск

```bash
docker-compose up -d
```

---

## ✅ Чеклист перед деплоем

- [ ] Все переменные окружения настроены
- [ ] База данных создана и доступна
- [ ] Миграции выполнены
- [ ] Роли заполнены (`seed:roles`)
- [ ] Backend собран (`npm run build`)
- [ ] Frontend собран (`npm run build`)
- [ ] CORS настроен правильно
- [ ] Webhook URL'ы обновлены в:
  - [ ] Green API (WhatsApp)
  - [ ] Chatrace (Instagram)
- [ ] SSL сертификат установлен (для production)
- [ ] Firewall настроен
- [ ] Логирование работает
- [ ] Резервное копирование базы данных настроено

## 🔍 Проверка после деплоя

1. **Проверьте backend:**
   ```bash
   curl https://your-domain.com/api/health
   ```

2. **Проверьте frontend:**
   - Откройте https://your-domain.com в браузере

3. **Проверьте базу данных:**
   ```bash
   # Подключитесь к базе
   psql -h localhost -U crm_user -d crm_db
   # Проверьте таблицы
   \dt
   ```

4. **Проверьте логи:**
   ```bash
   # PM2 логи
   pm2 logs crm-backend
   
   # Nginx логи
   tail -f /var/log/nginx/error.log
   tail -f /var/log/nginx/access.log
   ```

## 🐛 Решение проблем

### Backend не запускается
- Проверьте логи: `pm2 logs crm-backend`
- Проверьте переменные окружения
- Проверьте подключение к базе данных

### Frontend не загружается
- Проверьте, что `VITE_API_URL` правильный
- Проверьте консоль браузера на ошибки
- Проверьте Nginx конфигурацию

### Webhook'и не работают
- Проверьте, что URL доступен извне
- Проверьте логи backend на входящие запросы
- Проверьте настройки в Green API/Chatrace

### База данных не подключается
- Проверьте, что PostgreSQL запущен: `systemctl status postgresql`
- Проверьте права доступа пользователя
- Проверьте firewall правила

## 📞 Поддержка

Если возникли проблемы при деплое, проверьте:
1. Логи приложения
2. Логи Nginx
3. Логи PostgreSQL
4. Переменные окружения
5. Настройки firewall

