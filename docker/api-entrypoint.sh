#!/bin/sh
set -e

# cwd = /app/server (WORKDIR). Пути ниже — от него.
echo "→ Применяю миграции…"
node dist/db/migrate.js

echo "→ Сидирую администратора (идемпотентно)…"
node dist/db/seed.js

echo "→ Запускаю API…"
exec node dist/index.js
