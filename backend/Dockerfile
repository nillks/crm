FROM node:20-alpine AS builder

WORKDIR /app

# Копируем package файлы
COPY package*.json ./
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Production образ
FROM node:20-alpine

WORKDIR /app

# Копируем package файлы
COPY package*.json ./

# Устанавливаем только production зависимости
RUN npm ci --only=production && npm cache clean --force

# Копируем собранное приложение
COPY --from=builder /app/dist ./dist

# Создаем директорию для логов
RUN mkdir -p logs

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["node", "dist/main.js"]

