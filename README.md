# Красота рядом

Некоммерческий сервис: москвичи находят школы и мастеров бьюти-индустрии, которым нужны модели для практики (стрижки, окрашивание, маникюр и другое, бесплатно или за материалы). Независимый проект, не связан с Правительством Москвы.

**Текущий статус: демо-версия.** Настоящие заявки принимать нельзя, пока не оформлены статус организатора, документы и уведомление Роскомнадзора (см. «До настоящего запуска»).

## Запуск на своём компьютере

Нужны Node.js 22+ и Docker.

```bash
cp .env.example .env
docker compose -p beauty-matcher -f docker-compose.dev.yml up -d
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev -- -p 3100
```

Сайт: http://localhost:3100. Порт 3000 в этой настройке не используется: на нём может работать другое приложение.
В демо-режиме на странице входа есть кнопки входа за модель, школу, частного мастера и администратора.

Флаг `-p beauty-matcher` в командах Docker нужен, потому что в имени папки с проектом есть кириллица и Compose не может построить из него имя проекта.

## Показать на этом компьютере (продакшен-сборка)

Та же сборка и тот же compose-файл, что пойдут на сервер, но локально, под именем проекта `bm-demo`. Работает на http://localhost:3100, наружу не публикуется.

```bash
docker build --platform linux/amd64 --target runner -t beauty-matcher-app:local .
docker build --platform linux/amd64 --target tools  -t beauty-matcher-tools:local .
docker compose -p bm-demo -f docker-compose.shared.yml --env-file .env.production up -d --no-build db
docker compose -p bm-demo -f docker-compose.shared.yml --env-file .env.production --profile tools run --rm tools sh -c "npx prisma db push && npx tsx prisma/seed.ts"
docker compose -p bm-demo -f docker-compose.shared.yml --env-file .env.production up -d --no-build app
```

`.env.production` нужен с `POSTGRES_PASSWORD`, `SESSION_SECRET`, `SITE_URL=http://localhost:3100`, `DEMO_MODE=true` (см. `.env.production.example`). Секреты генерируйте свои.

Остановить: `docker compose -p bm-demo -f docker-compose.shared.yml --env-file .env.production stop`. Сбросить демо-данные: повторить команду с сидом. Если запущен `npm run dev -p 3100`, остановите его: порт один.

## Тесты

```bash
npm test            # модульные и интеграционные (нужна запущенная база)
npm run test:e2e    # сквозные, в Edge, отдельная база matcher_e2e и порт 3101
```

Один раз создайте базу для сквозных тестов:

```bash
echo 'CREATE DATABASE matcher_e2e;' | docker exec -i beauty-matcher-db-1 psql -U matcher -d matcher
```

## Размещение демо-ссылки

Нужны: сервер с Ubuntu (от 2 ядер и 4 ГБ памяти) в России, Docker, домен с записью DNS на сервер.

1. Скопируйте проект на сервер, например в `/opt/beauty-matcher`.
2. `cp .env.production.example .env.production` и заполните значения. Пароль базы и секрет сессий сгенерируйте новые.
3. `./deploy/setup.sh` поднимет сайт, базу и HTTPS.
4. Для ночного сброса добавьте в cron строку из шапки `deploy/reset-demo.sh`.

Скрипты сброса и первого запуска отказываются работать, если `DEMO_MODE` не `true`.

## До настоящего запуска

Это не код, а решения и документы. Без них `DEMO_MODE` на `false` переключать нельзя.

- Юридический статус организатора и текст условий и политики конфиденциальности (в сайте это помеченные черновики).
- Уведомление Роскомнадзора об обработке персональных данных, проверка требований к хранению (в том числе фото).
- Решение, кто отвечает, если услуга оказана плохо или возникла аллергия, и как принимаются претензии.
- Приложения VK и Яндекс для входа (код написан, ключей нет).
- СМС-провайдер: сейчас коды пишутся в журнал сервера (`src/lib/notify.ts`).
- Почта для писем (`SMTP_URL`).
- Проверка названия «Красота рядом» на товарные знаки. Домен `krasotaryadom.ru` куплен.

## Материалы для школ

`docs/outreach/`: письмо, скрипт звонка, сообщение знакомым, памятка по размещению.
