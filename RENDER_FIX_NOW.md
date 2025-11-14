# 🔧 СРОЧНОЕ ИСПРАВЛЕНИЕ ДЛЯ RENDER

## Ваши URL'ы:
- **Backend:** https://crm-backend-pf1k.onrender.com
- **Frontend:** https://crm-frontend-zpwa.onrender.com
- **Database:** postgresql://crm_user:Zdf71Ygectjnxe5ZGrDbhbvcfgg51JjN@dpg-d4bebpre5dus73eje54g-a/crm_db_zv57

## 🔴 Проблема 1: База данных - таблицы не созданы

### Решение:

1. **Откройте Backend сервис в Render Dashboard:**
   - https://dashboard.render.com → Backend сервис

2. **Проверьте переменные окружения:**
   - Убедитесь, что есть:
     - `DATABASE_URL` = `postgresql://crm_user:Zdf71Ygectjnxe5ZGrDbhbvcfgg51JjN@dpg-d4bebpre5dus73eje54g-a/crm_db_zv57`
     - `DB_SYNCHRONIZE` = `true`
     - `NODE_ENV` = `production`

3. **Создайте таблицы вручную через Shell:**
   - Откройте Shell в Backend сервисе
   - Выполните:
     ```bash
     cd backend
     npm run init:db
     npm run seed:roles
     ```

## 🔴 Проблема 2: Frontend - не работает при перезагрузке

### Причина:
Render использует свой статический хостинг, а не nginx. Нужно настроить `_redirects` файл.

### Решение:

1. **Создайте файл `frontend/public/_redirects`:**
   ```
   /*    /index.html   200
   ```

2. **Или добавьте в `vite.config.ts` настройку для правильного роутинга**

3. **Пересоберите frontend**

## 📝 Быстрое исправление:

### Backend:
1. Откройте Shell в Backend сервисе
2. Выполните: `cd backend && npm run init:db && npm run seed:roles`

### Frontend:
1. Создайте файл `frontend/public/_redirects` с содержимым: `/*    /index.html   200`
2. Запушьте изменения
3. Render автоматически пересоберет frontend

