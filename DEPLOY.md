# Деплой DirectorHub на t12.site (Docker Compose + Let's Encrypt)

Стек в проде: **nginx** (статика клиента + reverse-proxy) → **API** (Node/Fastify) → **MariaDB**, TLS от **Let's Encrypt** (автопродление). Всё в контейнерах, наружу открыты только 80/443.

```
Браузер ──443──▶ nginx (web) ──┬─ /            → статика React (client/dist)
                                ├─ /api/…       → api:4000
                                └─ /uploads/…   → api:4000 (cookie-гард)
                          api ──▶ db (MariaDB)
```

## 1. Предпосылки
- Сервер (Linux) с установленными **Docker** и **docker compose v2**.
- DNS: A-запись `t12.site` (и `www.t12.site`) → IP сервера. Проверь: `dig +short t12.site`.
- Порты **80** и **443** открыты в фаерволе.

## 2. Получить код и настроить .env
```bash
git clone <repo> directorhub && cd directorhub
cp .env.example .env
nano .env
```
Обязательно задай:
- `DB_ROOT_PASSWORD`, `DB_PASSWORD` — надёжные пароли БД.
- `JWT_SECRET` — сгенерируй: `openssl rand -hex 32`.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — учётка первого администратора.
- `CORS_ORIGIN=https://t12.site`.
- `DOMAIN=t12.site`, `DOMAIN_ALIASES=www.t12.site`, `LETSENCRYPT_EMAIL=...`.

## 3. Собрать образы
```bash
docker compose build
```

## 4. Выпустить TLS-сертификат (один раз)
```bash
chmod +x docker/init-letsencrypt.sh
./docker/init-letsencrypt.sh
```
Скрипт поднимет nginx, пройдёт ACME-челлендж по `http://t12.site/.well-known/...` и выпустит боевой сертификат. Если упало — проверь DNS и что порт 80 доступен снаружи.

## 5. Запустить всё
```bash
docker compose up -d
```
- API на старте **сам применит миграции** и **создаст администратора** (идемпотентно, из `ADMIN_*`).
- Открой `https://t12.site`, войди под `ADMIN_EMAIL` / `ADMIN_PASSWORD`, при желании смени пароль в профиле.

## 6. Эксплуатация
- **Логи:** `docker compose logs -f api` (или `web`, `db`, `certbot`).
- **Статус:** `docker compose ps`.
- **Миграции** применяются автоматически при каждом старте API. Вручную: `docker compose exec api node dist/db/migrate.js`.
- **Обновление кода:**
  ```bash
  git pull
  docker compose build
  docker compose up -d
  ```
- **Сертификаты** продлеваются автоматически (сервис `certbot` раз в 12 ч, nginx перезагружается раз в 6 ч).

## 7. Бэкапы
- **База:** `docker compose exec db sh -c 'mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" directorhub' > backup_$(date +%F).sql`
- **Вложения:** том `uploads` (или `docker run --rm -v directorhub_uploads:/u -v $PWD:/b alpine tar czf /b/uploads_$(date +%F).tgz -C /u .`).

## 8. Важные замечания
- **Вложения (`/uploads`)** отдаются только под cookie-сессией (`up_token`) — nginx проксирует их на API, не с диска. Не добавляй прямую раздачу `/uploads` с диска в nginx, иначе обойдёшь авторизацию.
- Cookie ставятся с флагом `secure` (только по HTTPS) — поэтому прод обязателен за TLS.
- Первый вход после выката: если держал открытую вкладку со старой сессией, перезагрузи страницу (нужна свежая cookie `up_token`).
- Порты `api`/`db` наружу не проброшены — доступ только внутри docker-сети через nginx.

## Файлы деплоя
- `docker-compose.yml` — db + api + web + certbot.
- `docker/api.Dockerfile` — сборка и запуск API (миграции+сид+старт).
- `docker/web.Dockerfile` — сборка клиента + nginx.
- `docker/nginx.conf` — конфиг сайта (TLS, прокси, SPA).
- `docker/init-letsencrypt.sh` — первичный выпуск сертификата.
- `.env.example` — шаблон переменных.
