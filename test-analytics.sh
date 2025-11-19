#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Конфигурация
API_URL="${API_URL:-http://localhost:3000/api}"
BACKEND_URL="${BACKEND_URL:-https://crm-backend-fhdw.onrender.com/api}"

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}🧪 Тестирование Analytics API${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo ""

# Функция для проверки доступности API
check_api() {
    local url=$1
    echo -e "${YELLOW}Проверка доступности API: ${url}${NC}"
    
    if curl -s -f -o /dev/null "${url}/health" 2>/dev/null; then
        echo -e "${GREEN}✅ API доступен${NC}"
        return 0
    else
        echo -e "${RED}❌ API недоступен${NC}"
        return 1
    fi
}

# Функция для получения токена
get_token() {
    local email="${1:-admin@example.com}"
    local password="${2:-admin123}"
    
    echo -e "${YELLOW}Получение токена для ${email}...${NC}"
    
    local response=$(curl -s -X POST "${API_URL}/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"${email}\",\"password\":\"${password}\"}")
    
    local token=$(echo "$response" | jq -r '.accessToken // empty' 2>/dev/null)
    
    if [ -z "$token" ] || [ "$token" = "null" ]; then
        echo -e "${RED}❌ Не удалось получить токен${NC}"
        echo "Response: $response"
        return 1
    fi
    
    echo -e "${GREEN}✅ Токен получен${NC}"
    echo "$token"
}

# Функция для тестирования endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local token=$3
    local description=$4
    local data=${5:-""}
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Тест: ${description}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "Endpoint: ${method} ${endpoint}"
    
    local headers=(-H "Content-Type: application/json")
    if [ -n "$token" ]; then
        headers+=(-H "Authorization: Bearer ${token}")
    fi
    
    local curl_cmd="curl -s -w '\nHTTP_CODE:%{http_code}' ${headers[@]}"
    
    if [ "$method" = "GET" ]; then
        response=$(eval "${curl_cmd} -X GET '${API_URL}${endpoint}'")
    elif [ "$method" = "POST" ]; then
        response=$(eval "${curl_cmd} -X POST '${API_URL}${endpoint}' -d '${data}'")
    fi
    
    http_code=$(echo "$response" | grep -o 'HTTP_CODE:[0-9]*' | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✅ HTTP ${http_code}${NC}"
        echo -e "${GREEN}Response:${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 0
    else
        echo -e "${RED}❌ HTTP ${http_code}${NC}"
        echo -e "${RED}Response:${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 1
    fi
}

# Основная функция тестирования
main() {
    # Определяем, какой URL использовать
    if check_api "$API_URL"; then
        API_BASE="$API_URL"
    elif check_api "$BACKEND_URL"; then
        API_BASE="$BACKEND_URL"
        API_URL="$BACKEND_URL"
    else
        echo -e "${RED}❌ Не удалось подключиться к API${NC}"
        echo "Попробуйте установить переменную API_URL или BACKEND_URL"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}Используется API: ${API_BASE}${NC}"
    echo ""
    
    # Получаем токен
    TOKEN=$(get_token)
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Не удалось получить токен. Пропускаем защищенные endpoints.${NC}"
        TOKEN=""
    fi
    
    # Тестируем endpoints
    success_count=0
    fail_count=0
    
    # 1. SLA метрики
    if test_endpoint "GET" "/analytics/sla" "$TOKEN" "SLA метрики"; then
        ((success_count++))
    else
        ((fail_count++))
    fi
    
    # 2. SLA метрики с фильтром по датам
    start_date=$(date -d "30 days ago" +%Y-%m-%d 2>/dev/null || date -v-30d +%Y-%m-%d 2>/dev/null || echo "2024-01-01")
    end_date=$(date +%Y-%m-%d)
    if test_endpoint "GET" "/analytics/sla?startDate=${start_date}&endDate=${end_date}" "$TOKEN" "SLA метрики с фильтром по датам"; then
        ((success_count++))
    else
        ((fail_count++))
    fi
    
    # 3. KPI метрики
    if test_endpoint "GET" "/analytics/kpi" "$TOKEN" "KPI метрики"; then
        ((success_count++))
    else
        ((fail_count++))
    fi
    
    # 4. KPI метрики с фильтром по датам
    if test_endpoint "GET" "/analytics/kpi?startDate=${start_date}&endDate=${end_date}" "$TOKEN" "KPI метрики с фильтром по датам"; then
        ((success_count++))
    else
        ((fail_count++))
    fi
    
    # 5. Аналитика по каналам
    if test_endpoint "GET" "/analytics/channels" "$TOKEN" "Аналитика по каналам"; then
        ((success_count++))
    else
        ((fail_count++))
    fi
    
    # 6. Аналитика по каналам с фильтром по датам
    if test_endpoint "GET" "/analytics/channels?startDate=${start_date}&endDate=${end_date}" "$TOKEN" "Аналитика по каналам с фильтром по датам"; then
        ((success_count++))
    else
        ((fail_count++))
    fi
    
    # Итоги
    echo ""
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}📊 Итоги тестирования${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ Успешно: ${success_count}${NC}"
    echo -e "${RED}❌ Ошибок: ${fail_count}${NC}"
    echo ""
    
    if [ $fail_count -eq 0 ]; then
        echo -e "${GREEN}🎉 Все тесты пройдены успешно!${NC}"
        exit 0
    else
        echo -e "${RED}⚠️  Некоторые тесты не прошли${NC}"
        exit 1
    fi
}

# Запуск
main

