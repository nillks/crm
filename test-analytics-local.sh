#!/bin/bash

# Простой тест для проверки структуры модуля

echo "🔍 Проверка структуры Analytics модуля..."
echo ""

# Проверка файлов
files=(
    "backend/src/analytics/analytics.module.ts"
    "backend/src/analytics/analytics.service.ts"
    "backend/src/analytics/analytics.controller.ts"
    "backend/src/analytics/dto/sla-metrics.dto.ts"
    "backend/src/analytics/dto/kpi-metrics.dto.ts"
    "backend/src/analytics/dto/channel-analytics.dto.ts"
)

all_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - НЕ НАЙДЕН"
        all_exist=false
    fi
done

echo ""
echo "🔍 Проверка импортов в app.module.ts..."

if grep -q "AnalyticsModule" backend/src/app.module.ts; then
    echo "✅ AnalyticsModule импортирован в AppModule"
else
    echo "❌ AnalyticsModule НЕ импортирован в AppModule"
    all_exist=false
fi

echo ""
echo "🔍 Проверка endpoints в контроллере..."

endpoints=(
    "GET.*sla"
    "GET.*kpi"
    "GET.*channels"
)

for endpoint in "${endpoints[@]}"; do
    if grep -q "$endpoint" backend/src/analytics/analytics.controller.ts; then
        echo "✅ Endpoint найден: $endpoint"
    else
        echo "❌ Endpoint НЕ найден: $endpoint"
        all_exist=false
    fi
done

echo ""
echo "🔍 Проверка методов в сервисе..."

methods=(
    "calculateSLA"
    "calculateKPI"
    "getChannelAnalytics"
)

for method in "${methods[@]}"; do
    if grep -q "$method" backend/src/analytics/analytics.service.ts; then
        echo "✅ Метод найден: $method"
    else
        echo "❌ Метод НЕ найден: $method"
        all_exist=false
    fi
done

echo ""
if [ "$all_exist" = true ]; then
    echo "✅ Все проверки пройдены!"
    echo ""
    echo "📝 Для тестирования на Render.com:"
    echo "1. Закоммитьте изменения: git add . && git commit -m 'Add Analytics module'"
    echo "2. Запушьте: git push"
    echo "3. Дождитесь деплоя на Render.com"
    echo "4. Запустите: ./test-analytics.sh"
    exit 0
else
    echo "❌ Некоторые проверки не пройдены"
    exit 1
fi

