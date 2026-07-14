# ---- Сборка сервера (монорепо npm workspaces) ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Манифесты — для кэша npm ci
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
RUN npm ci

# Исходники сервера + сборка (tsup → dist/index.js, dist/db/migrate.js, dist/db/seed.js)
COPY server ./server
RUN npm run build -w server

# ---- Рантайм ----
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/server

# Зависимости (нативные argon2/sharp собраны в builder под linux) и сборка
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/server/dist ./dist
# .sql-миграции не бандлятся — кладём рядом (migrate ищет ./src/db/migrations от cwd)
COPY --from=builder /app/server/src/db/migrations ./src/db/migrations
COPY server/package.json ./package.json
COPY package.json /app/package.json

COPY docker/api-entrypoint.sh /entrypoint.sh
# Убираем возможные CRLF (Windows) и делаем исполняемым
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["/entrypoint.sh"]
