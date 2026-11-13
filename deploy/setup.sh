#!/bin/sh
# Первый запуск на сервере: поднимает сайт, создаёт таблицы и демо-данные.
set -eu
cd "$(dirname "$0")/.."

[ -f .env.production ] || { echo "Нет файла .env.production. Скопируйте .env.production.example и заполните." >&2; exit 1; }
grep -qE '^DEMO_MODE=true[[:space:]]*$' .env.production || { echo "Первый запуск возможен только с DEMO_MODE=true." >&2; exit 1; }

docker compose -p beauty-matcher --env-file .env.production up -d --build db
docker compose -p beauty-matcher --env-file .env.production --profile tools run --rm tools \
  sh -c "npx prisma db push && npx tsx prisma/seed.ts"
docker compose -p beauty-matcher --env-file .env.production up -d --build
echo "Готово. Проверьте: https://$(grep -E '^SITE_DOMAIN=' .env.production | cut -d= -f2)/api/health"
