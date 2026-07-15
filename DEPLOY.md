# Деплой DirectorHub на VPS (GitHub → PM2 + Nginx)

Схема: код в **GitHub**, на VPS — `git pull`. **Nginx** отдаёт статику клиента и проксирует на **API** (Fastify под **PM2**), данные — в **MariaDB**. TLS — **Let's Encrypt** через `certbot --nginx`. Обновления: `git pull` + пересборка.

```
Браузер ──443──▶ Nginx ──┬─ /            → статика React (client/dist)
                          ├─ /api/…       → 127.0.0.1:4000 (PM2)
                          └─ /uploads/…   → 127.0.0.1:4000 (cookie-гард up_token)
                    API ──▶ MariaDB (127.0.0.1:3306)
```

Репозиторий: `https://github.com/timurrozmetow/check.git`, ветка `main`.

---

## 1. Предпосылки на VPS (Ubuntu/Debian)

```bash
# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential   # build-essential нужен для argon2/sharp

# MariaDB, Nginx, git, PM2
sudo apt-get install -y mariadb-server nginx git
sudo npm install -g pm2
```
DNS: A-записи `t12.site` и `www.t12.site` → IP VPS (`dig +short t12.site`). Открыть порты **80** и **443** (`sudo ufw allow 80,443/tcp`).

## 2. База данных

```bash
sudo mysql <<'SQL'
CREATE DATABASE directorhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'directorhub'@'localhost' IDENTIFIED BY 'СИЛЬНЫЙ_ПАРОЛЬ';
GRANT ALL PRIVILEGES ON directorhub.* TO 'directorhub'@'localhost';
FLUSH PRIVILEGES;
SQL
```

## 3. Код и переменные окружения

```bash
sudo mkdir -p /var/www && cd /var/www
sudo git clone https://github.com/timurrozmetow/check.git directorhub
sudo chown -R $USER:$USER /var/www/directorhub
cd /var/www/directorhub

cp server/.env.example server/.env
nano server/.env
```
В `server/.env` для прода задайте:
- `NODE_ENV=production`, `HOST=127.0.0.1`, `PORT=4000`
- `DB_USER=directorhub`, `DB_PASSWORD=…`, `DB_NAME=directorhub`
- `JWT_SECRET` — `openssl rand -hex 32`
- `CORS_ORIGIN=https://t12.site`
- `UPLOADS_DIR=/var/www/directorhub/server/uploads` (абсолютный путь; папка в `.gitignore` — `git pull` её не тронет)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` — первый администратор

## 4. Сборка, миграции, первый админ

```bash
npm ci                          # ставит зависимости обоих воркспейсов
npm run build                   # server (tsup) + client (vite)
# Миграции/сид запускаем ИЗ server/, иначе dotenv не найдёт server/.env (ищет в cwd):
cd server
node dist/db/migrate.js         # применить миграции
node dist/db/seed.js            # создать администратора (ТОЛЬКО первый раз)
cd ..
```

## 5. Запуск API под PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save                        # запомнить список процессов
pm2 startup                     # автозапуск при перезагрузке (выполните выданную команду)
```
Проверка: `curl -s http://127.0.0.1:4000/api/v1/health` (или `pm2 logs directorhub-api`).

## 6. Nginx + TLS

Два варианта. **Вариант A** — простой (certbot сам создаёт TLS-блок). **Вариант B** — полный готовый конфиг `deploy/nginx.t12.conf` (HSTS, security-заголовки, хардненинг по IP).

### Вариант A — автоматический (проще)
```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/directorhub
sudo ln -sf /etc/nginx/sites-available/directorhub /etc/nginx/sites-enabled/directorhub
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d t12.site -d www.t12.site   # впишет 443-блок и продление сам
```

### Вариант B — полный конфиг `nginx.t12.conf`
Он ссылается на сертификат, поэтому TLS выпускаем **до** включения:
```bash
sudo apt-get install -y certbot
sudo mkdir -p /var/www/certbot

# 1) Разовый выпуск (порт 80 должен быть свободен)
sudo systemctl stop nginx 2>/dev/null || true
sudo certbot certonly --standalone -d t12.site -d www.t12.site \
     -m ВАШ_EMAIL --agree-tos --no-eff-email

# 2) Включаем полный конфиг
sudo cp deploy/nginx.t12.conf /etc/nginx/sites-available/directorhub
sudo ln -sf /etc/nginx/sites-available/directorhub /etc/nginx/sites-enabled/directorhub
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl start nginx

# 3) Переводим продление на webroot (без остановки nginx) + reload-хук
sudo certbot certonly --webroot -w /var/www/certbot -d t12.site -d www.t12.site
printf '#!/bin/sh\nsystemctl reload nginx\n' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
sudo certbot renew --dry-run
```

Откройте `https://t12.site`, войдите под `ADMIN_EMAIL` / `ADMIN_PASSWORD`, смените пароль в профиле.

---

## 7. Обновления (каждый релиз)

На VPS из корня репозитория:
```bash
./deploy/update.sh
```
Скрипт делает: `git pull` → `npm ci` → `npm run build` → миграции → `pm2 reload`. **Сид не запускается** — админ и данные не трогаются. Клиент обновляется автоматически (nginx отдаёт свежий `client/dist`).

Рабочий цикл: правки → коммит и `git push` на локальной машине → `./deploy/update.sh` на VPS.

## 8. Эксплуатация

- Логи API: `pm2 logs directorhub-api` · статус: `pm2 status` · рестарт: `pm2 restart directorhub-api`.
- Логи nginx: `sudo tail -f /var/log/nginx/error.log`.
- Сертификат продлевается сам (таймер `certbot.timer`); проверка: `sudo certbot renew --dry-run`.

## 9. Бэкапы

```bash
# База
mysqldump -u directorhub -p directorhub > backup_$(date +%F).sql
# Вложения
tar czf uploads_$(date +%F).tgz -C /var/www/directorhub/server uploads
```

## 10. Важные замечания

- **`/uploads` только через API** (cookie `up_token`). Nginx проксирует их на `127.0.0.1:4000`, а не отдаёт `alias`'ом с диска — иначе файлы станут публичными в обход авторизации.
- **Cookie `secure`** — работают только по HTTPS, поэтому TLS обязателен.
- **SSE-уведомления** (`/api/v1/notifications/stream`) — шина in-memory, поэтому PM2 держит **один процесс** (`fork`, не cluster). Не увеличивайте `instances`.
- **`.wasm`**: если анимации-лоадер не грузятся, убедитесь, что nginx отдаёт `application/wasm` (в свежих версиях mime.types это уже есть).
- **Перенос текущих данных** с локальной базы (по желанию): `mysqldump` локально → импорт на VPS **до** первого `seed`.

> Docker-вариант (`docker-compose.yml`, `docker/`) остаётся в репозитории как альтернатива и в этом сценарии не используется.
