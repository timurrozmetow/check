#!/usr/bin/env bash
# Обновление DirectorHub на VPS из GitHub.
# Запуск из корня репозитория:  ./deploy/update.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> 1/5 git pull (только fast-forward)"
git pull --ff-only

echo "==> 2/5 установка зависимостей"
npm ci

echo "==> 3/5 сборка (server tsup + client vite)"
npm run build

echo "==> 4/5 миграции БД (идемпотентно, по журналу)"
# Запускаем из server/, чтобы dotenv нашёл server/.env (он резолвится от cwd)
( cd server && node dist/db/migrate.js )

echo "==> 5/5 перезапуск API без даунтайма"
pm2 reload directorhub-api

echo "✓ Готово."
echo "  Клиент обновлён — nginx уже отдаёт свежий client/dist."
echo "  Сид НЕ запускался: администратор и данные не тронуты."
