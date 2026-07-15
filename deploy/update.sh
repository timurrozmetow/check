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
# Циклический чанк из vite manualChunks даёт в рантайме TDZ («Cannot access 'x'
# before initialization») и белый экран, при этом сама сборка «успешна». Ловим
# предупреждение из лога и НЕ выкатываем такую сборку.
if ! build_log="$(npm run build 2>&1)"; then
  echo "$build_log"
  echo "✗ Сборка завершилась с ошибкой — деплой остановлен."
  exit 1
fi
echo "$build_log"
if printf '%s\n' "$build_log" | grep -qi "Circular chunk"; then
  echo "✗ Обнаружен «Circular chunk» — деплой остановлен (иначе белый экран на проде)."
  exit 1
fi

echo "==> 4/5 миграции БД (идемпотентно, по журналу)"
# Запускаем из server/, чтобы dotenv нашёл server/.env (он резолвится от cwd)
( cd server && node dist/db/migrate.js )

echo "==> 5/5 перезапуск API без даунтайма"
pm2 reload directorhub-api

echo "✓ Готово."
echo "  Клиент обновлён — nginx уже отдаёт свежий client/dist."
echo "  Сид НЕ запускался: администратор и данные не тронуты."
