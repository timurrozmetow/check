# DirectorHub

Веб-приложение для управления задачами в многокомпанейском бизнесе с наглядной панелью директора. Три роли — **администратор**, **директор**, **сотрудник**; директор видит только подтверждённую информацию и принимает решения в два клика; в конце месяца система формирует полный Word-отчёт.

Интерфейс — только на русском. Светлая и тёмная темы. Дизайн — современный офисный дашборд (акцент индиго, шрифт Golos Text, мягкие тени, анимации).

## Стек

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS + shadcn/ui, TanStack Query, Zustand, React Router, framer-motion, date-fns (ru), sonner.
- **Backend**: Node.js, Fastify, TypeScript, Drizzle ORM + MySQL 8 / MariaDB, zod, @fastify/jwt (argon2), @fastify/multipart, sharp, docx, pino.
- **Деплой**: PM2 + Nginx.

## Структура

```
directorhub/
├── server/   # Fastify API (модульная архитектура: modules/*, db/, plugins/, shared/)
├── client/   # React SPA (api/, components/, features/, pages/, layouts/, stores/)
├── docs/     # ТЗ и контракты API
└── deploy/   # nginx.conf.example
```

## Требования

- Node.js 20+ (проверено на 26).
- MySQL 8 или MariaDB 10.4+ (подойдёт в составе XAMPP).

## Быстрый старт (разработка)

1. **Установка зависимостей** (из корня — монорепо с npm workspaces):

   ```bash
   npm install
   ```

2. **Настройка окружения**: скопируйте `server/.env.example` в `server/.env` и укажите доступ к БД:

   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=ваш_пароль
   DB_NAME=directorhub
   JWT_SECRET=длинная_случайная_строка
   ```

3. **Создайте базу данных** и примените миграции + демо-данные:

   ```sql
   CREATE DATABASE directorhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

   ```bash
   npm run db:migrate   # применить схему
   npm run db:seed      # демо: 2 проекта, 6 задач, запрос решения, обновления
   ```

4. **Запуск dev-серверов** (API :4000 + фронтенд :5173 одной командой):

   ```bash
   npm run dev
   ```

   Откройте http://localhost:5173.

### Демо-доступы (после seed)

| Роль        | Email                     | Пароль        |
| ----------- | ------------------------- | ------------- |
| Директор    | director@directorhub.ru   | director12345 |
| Администратор | admin@directorhub.ru    | admin12345    |
| Сотрудник   | ivan@directorhub.ru       | employee12345 |
| Сотрудник   | maria@directorhub.ru      | employee12345 |

На экране входа доступы можно подставить одним кликом.

## Скрипты

Из корня:

- `npm run dev` — оба сервера в watch-режиме.
- `npm run build` — сборка сервера и клиента.
- `npm run typecheck` — проверка типов обоих пакетов.
- `npm run db:generate` — сгенерировать SQL-миграцию из схемы Drizzle.
- `npm run db:migrate` / `npm run db:seed` — применить миграции / залить демо-данные.

Проверка API (сервер должен быть запущен):

```bash
node scripts/smoke-test.mjs
```

## Продакшн (PM2 + Nginx)

1. Соберите проект:

   ```bash
   npm run build
   ```

   Фронтенд окажется в `client/dist`, сервер — в `server/dist`.

2. На сервере задайте `server/.env` с `NODE_ENV=production`, боевым `JWT_SECRET` и доступом к БД, примените `npm run db:migrate`.

3. Запустите API под PM2 (из корня):

   ```bash
   pm2 start ecosystem.config.cjs
   pm2 save
   ```

   > SSE-шина уведомлений хранится в памяти процесса, поэтому API работает в одном экземпляре (fork). Для горизонтального масштабирования потребуется вынести шину в Redis.

4. Настройте Nginx по образцу `deploy/nginx.conf.example`: он отдаёт `client/dist`, проксирует `/api` на 127.0.0.1:4000 (с отключённой буферизацией для SSE) и раздаёт `/uploads`.

## Ключевые возможности

- **Роли и права** проверяются на уровне API (не только UI): сотрудник видит лишь свои задачи, директор — только подтверждённую информацию.
- **Жизненный цикл задачи**: статусы, ручной % готовности (шаг 5), автоматический расчёт времени выполнения (`completed_at − created_at`).
- **Модерация**: обновления сотрудников (текст + файлы) проходят подтверждение админом, только принятые видны директору и попадают в хронологию.
- **Решения директора**: запросы «выбор варианта» (с фото) или «согласование» — крупные наглядные карточки, решение в 2 клика.
- **Файлы**: изображения (с превью), PDF, Word, Excel; лимит 20 МБ, валидация MIME.
- **Уведомления** внутри сайта через SSE + колокольчик с бейджем.
- **Месячный Word-отчёт**: титул, сводка, 3 графика (статусы/проекты/динамика), таблица задач, детализация завершённых с фото и хронологией, колонтитулы с номерами страниц.
