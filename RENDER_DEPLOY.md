# 🚀 Быстрый деплой на Render (БЕСПЛАТНО)

## Шаг 1: Регистрация на Render

1. Перейдите на https://render.com
2. Зарегистрируйтесь через GitHub (рекомендуется)
3. Подключите ваш GitHub репозиторий

## Шаг 2: Деплой PostgreSQL базы данных

1. В Dashboard нажмите **"New +"** → **"PostgreSQL"**
2. Настройки:
   - **Name:** `crm-database`
   - **Database:** `crm_db`
   - **User:** `crm_user`
   - **Region:** Выберите ближайший (например, Frankfurt)
   - **PostgreSQL Version:** 15
   - **Plan:** **Free** (512 MB RAM)
3. Нажмите **"Create Database"**
4. **ВАЖНО:** Сохраните **Internal Database URL** (он понадобится позже)
   - Формат: `postgresql://crm_user:password@dpg-xxxxx-a/crm_db`

## Шаг 3: Деплой Backend

1. В Dashboard нажмите **"New +"** → **"Web Service"**
2. Подключите ваш GitHub репозиторий
3. Настройки:
   - **Name:** `crm-backend`
   - **Region:** Тот же, что и для PostgreSQL
   - **Branch:** `main` (или ваша основная ветка)
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:prod`
   - **Plan:** **Free** (512 MB RAM)

4. **Environment Variables** (добавьте все эти переменные):
   ```
   NODE_ENV=production
   PORT=3000
   
   # Database (используйте Internal Database URL из шага 2)
   DATABASE_URL=postgresql://crm_user:password@dpg-xxxxx-a/crm_db
   # ИЛИ отдельные переменные:
   DB_HOST=dpg-xxxxx-a
   DB_PORT=5432
   DB_USERNAME=crm_user
   DB_PASSWORD=your_password
   DB_DATABASE=crm_db
   
   # JWT
   JWT_SECRET=your_super_secret_jwt_key_min_32_chars_long_123456789
   JWT_EXPIRES_IN=24h
   
   # CORS (замените на ваш frontend URL после деплоя)
   CORS_ORIGIN=https://crm-frontend.onrender.com
   
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

5. Нажмите **"Create Web Service"**
6. Дождитесь завершения деплоя (5-10 минут)
7. **Сохраните URL backend:** `https://crm-backend.onrender.com`

## Шаг 4: Инициализация базы данных

После успешного деплоя backend:

1. Откройте **Shell** в Render (кнопка рядом с "Manual Deploy")
2. Выполните команды:
   ```bash
   cd backend
   npm run seed:roles
   ```

## Шаг 5: Деплой Frontend

1. В Dashboard нажмите **"New +"** → **"Static Site"**
2. Подключите ваш GitHub репозиторий
3. Настройки:
   - **Name:** `crm-frontend`
   - **Branch:** `main` (или ваша основная ветка)
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

4. **Environment Variables:**
   ```
   VITE_API_URL=https://crm-backend.onrender.com/api
   ```
   (Замените на ваш реальный backend URL)

5. Нажмите **"Create Static Site"**
6. Дождитесь завершения деплоя (3-5 минут)
7. **Сохраните URL frontend:** `https://crm-frontend.onrender.com`

## Шаг 6: Обновление CORS

После получения URL frontend:

1. Вернитесь в настройки **Backend** сервиса
2. Обновите переменную окружения:
   ```
   CORS_ORIGIN=https://crm-frontend.onrender.com
   ```
3. Нажмите **"Save Changes"** - сервис автоматически перезапустится

## Шаг 7: Настройка Webhook'ов

### WhatsApp (Green API):
1. Войдите в https://console.green-api.com/instanceList
2. Настройте webhook URL: `https://crm-backend.onrender.com/api/whatsapp/webhook`

### Instagram (Chatrace):
1. Войдите в https://chatrace.com/en/settings?acc=1543616
2. Настройте webhook URL: `https://crm-backend.onrender.com/api/instagram/webhook`

## ✅ Готово!

Ваше приложение доступно по адресу:
- **Frontend:** https://crm-frontend.onrender.com
- **Backend API:** https://crm-backend.onrender.com/api

## ⚠️ Важные замечания:

1. **Бесплатный план Render:**
   - Сервисы "засыпают" после 15 минут неактивности
   - Первый запрос после "сна" может занять 30-60 секунд
   - Это нормально для бесплатного плана

2. **Для production:**
   - Рассмотрите платный план ($7/месяц за сервис)
   - Или используйте другой хостинг (VPS от $5/месяц)

3. **Проверка работы:**
   - Откройте frontend URL в браузере
   - Попробуйте зарегистрироваться
   - Проверьте работу чатов

## 🔧 Решение проблем:

### Backend не запускается:
- Проверьте логи в Render Dashboard
- Убедитесь, что все переменные окружения установлены
- Проверьте подключение к базе данных

### Frontend показывает ошибки:
- Проверьте, что `VITE_API_URL` правильный
- Откройте консоль браузера (F12) для деталей ошибок

### База данных не подключается:
- Убедитесь, что используете **Internal Database URL**
- Проверьте, что backend и database в одном регионе

