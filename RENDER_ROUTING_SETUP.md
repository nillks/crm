# Настройка роутинга для SPA на Render.com

## Проблема
При перезагрузке страницы или прямом переходе на маршрут (например, `/settings/ai`) Render.com возвращает 404, так как сервер не знает, как обработать клиентские маршруты React Router.

## Решение

### Способ 1: Через панель управления Render.com (РЕКОМЕНДУЕТСЯ)

1. Откройте панель управления Render.com:
   ```
   https://dashboard.render.com/web/srv-d4bgm8n5r7bs7395net0
   ```

2. Перейдите в раздел **Settings**

3. Найдите раздел **Redirects/Rewrites**

4. Добавьте новое правило:
   - **Source:** `/*`
   - **Destination:** `/index.html`
   - **Type:** `Rewrite` (не Redirect!)

5. Сохраните изменения

6. Перезапустите сервис (или дождитесь автоматического перезапуска)

### Способ 2: Через static.json (уже настроен)

Файл `frontend/public/static.json` уже настроен:
```json
{
  "routes": {
    "/**": "index.html"
  }
}
```

Файл автоматически копируется в `frontend/dist/static.json` при сборке.

**Важно:** Render.com может не читать `static.json` автоматически для статических сайтов. Рекомендуется использовать Способ 1.

## Проверка

После настройки:

1. Откройте `https://crm-frontend-8qrl.onrender.com/settings/ai`
2. Перезагрузите страницу (F5)
3. Страница должна отображаться без ошибки 404

## Альтернативное решение

Если настройка через панель управления не работает, можно использовать `HashRouter` вместо `BrowserRouter` в React:

```tsx
import { HashRouter } from 'react-router-dom';

// Вместо BrowserRouter используйте HashRouter
<HashRouter>
  <Routes>
    {/* ваши маршруты */}
  </Routes>
</HashRouter>
```

Это изменит URL на формат `/#/settings/ai`, но роутинг будет работать без настройки сервера.

