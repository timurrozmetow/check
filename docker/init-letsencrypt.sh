#!/bin/sh
# Первичный выпуск TLS-сертификата Let's Encrypt для nginx в docker compose.
# Запускать ОДИН раз на сервере: ./docker/init-letsencrypt.sh
# Требует: docker compose, заполненный .env (DOMAIN, DOMAIN_ALIASES, LETSENCRYPT_EMAIL),
# собранные образы (docker compose build).
set -e

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Нет .env — скопируй .env.example в .env и заполни."; exit 1
fi

# Безопасно читаем только нужные ключи (без выполнения .env — иначе
# значения со спецсимволами/пробелами, напр. cron, ломают шелл).
env_val() {
  grep -E "^[[:space:]]*$1=" .env 2>/dev/null | tail -n1 | cut -d= -f2- \
    | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' \
          -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}
DOMAIN="$(env_val DOMAIN)"; DOMAIN="${DOMAIN:-t12.site}"
DOMAIN_ALIASES="$(env_val DOMAIN_ALIASES)"
EMAIL="$(env_val LETSENCRYPT_EMAIL)"
data_path="./docker/certbot"
rsa_key_size=4096

# Домены: основной + алиасы
domains="$DOMAIN"
for d in $DOMAIN_ALIASES; do domains="$domains $d"; done
domain_args=""
for d in $domains; do domain_args="$domain_args -d $d"; done

if [ -z "$EMAIL" ]; then email_arg="--register-unsafely-without-email"; else email_arg="--email $EMAIL"; fi

echo "### Домены: $domains"
mkdir -p "$data_path/conf" "$data_path/www" "$data_path/conf/live/$DOMAIN"

# Рекомендованные TLS-параметры (их include-ит nginx.conf)
if [ ! -e "$data_path/conf/options-ssl-nginx.conf" ] || [ ! -e "$data_path/conf/ssl-dhparams.pem" ]; then
  echo "### Скачиваю рекомендованные TLS-параметры…"
  curl -sfL https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf -o "$data_path/conf/options-ssl-nginx.conf"
  curl -sfL https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem -o "$data_path/conf/ssl-dhparams.pem"
fi

# 1) Временный самоподписанный сертификат, чтобы nginx стартовал на 443
echo "### Создаю временный сертификат для $DOMAIN…"
docker compose run --rm --entrypoint sh certbot -c \
  "openssl req -x509 -nodes -newkey rsa:$rsa_key_size -days 1 \
   -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
   -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem -subj /CN=localhost"

# 2) Поднимаем nginx (и его зависимости)
echo "### Поднимаю nginx…"
docker compose up -d web

# 3) Удаляем временный сертификат
echo "### Удаляю временный сертификат…"
docker compose run --rm --entrypoint sh certbot -c \
  "rm -rf /etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/archive/$DOMAIN /etc/letsencrypt/renewal/$DOMAIN.conf"

# 4) Запрашиваем боевой сертификат.
# ВАЖНО: entrypoint сервиса certbot в compose переопределён на цикл автопродления,
# поэтому для разового выпуска явно возвращаем entrypoint=certbot.
echo "### Запрашиваю боевой сертификат Let's Encrypt…"
docker compose run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot \
  $email_arg $domain_args \
  --rsa-key-size $rsa_key_size --agree-tos --no-eff-email --force-renewal

# 5) Перезагружаем nginx
echo "### Перезагружаю nginx…"
docker compose exec web nginx -s reload

echo "### Готово. HTTPS для: $domains"
