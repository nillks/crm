# CRM Contact Center Monorepo

Monorepo структура для CRM контакт-центра с разделением на backend и frontend.

## Структура проекта

```
crm/
├── backend/          # NestJS приложение
├── frontend/         # React приложение
├── package.json      # Root package.json
└── .gitignore
```

## Технологии

### Backend
- Node.js 20
- NestJS 10
- TypeScript

### Frontend
- React 18
- Vite
- TypeScript
- MUI v6

## Установка

1. Установите зависимости для всех workspace:
```bash
npm install
```

Или установите по отдельности:
```bash
npm install --workspace=backend
npm install --workspace=frontend
```

## Настройка переменных окружения

### Backend
Скопируйте `.env.example` в `.env` в папке `backend/`:
```bash
cp backend/.env.example backend/.env
```

Отредактируйте `backend/.env` и настройте необходимые переменные.

### Frontend
Скопируйте `.env.example` в `.env` в папке `frontend/`:
```bash
cp frontend/.env.example frontend/.env
```

Отредактируйте `frontend/.env` и настройте необходимые переменные.

## Запуск

### Запуск всех приложений (backend + frontend)
```bash
npm run dev
```

### Запуск только backend
```bash
npm run dev:backend
```

### Запуск только frontend
```bash
npm run dev:frontend
```

## Сборка

### Сборка всех приложений
```bash
npm run build
```

### Сборка только backend
```bash
npm run build:backend
```

### Сборка только frontend
```bash
npm run build:frontend
```

## Порты

- Backend: http://localhost:3000
- Frontend: http://localhost:5173 (Vite default)

## Дополнительная информация

- Backend использует NestJS CLI для разработки
- Frontend использует Vite для быстрой разработки
- CORS настроен для работы с frontend на порту 5173

