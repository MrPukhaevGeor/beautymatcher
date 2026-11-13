#!/bin/sh
# Ночной сброс демо-данных. Сид стирает ВСЕ строки, поэтому скрипт работает только в демо-режиме.
# Cron (каждую ночь в 04:00):  0 4 * * *  cd /opt/beauty-matcher && ./deploy/reset-demo.sh >> /var/log/matcher-reset.log 2>&1
# На общем сервере добавьте перед командой COMPOSE_FILE=docker-compose.shared.yml
set -eu
cd "$(dirname "$0")/.."

if ! grep -qE '^DEMO_MODE=true[[:space:]]*$' .env.production; then
  echo "DEMO_MODE в .env.production не равен true: сброс запрещён, чтобы не стереть настоящие данные." >&2
  exit 1
fi

docker compose -p beauty-matcher -f "${COMPOSE_FILE:-docker-compose.yml}" --env-file .env.production --profile tools run --rm tools \
  sh -c "npx prisma db push && npx tsx prisma/seed.ts"
echo "Демо-данные сброшены: $(date -u +%FT%TZ)"
