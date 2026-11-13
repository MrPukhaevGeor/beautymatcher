# Сборка и запуск сервиса «Красота рядом». Три цели: builder, tools (служебные команды) и runner (сайт).

FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# DATABASE_URL нужен только для генерации клиента Prisma, к базе при сборке не подключаемся.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build" NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# Служебные команды: применение схемы и сброс демо-данных.
# Ставим только то, что нужно для prisma db push и сида (без Next, Playwright, Tailwind и т. п.):
# так образ в разы меньше, это важно для сервера с ограниченным диском.
FROM base AS tools
RUN echo '{"name":"tools","private":true,"type":"module"}' > package.json \
 && npm install --no-audit --no-fund \
      prisma@^7.10.1 @prisma/client@^7.10.1 @prisma/adapter-pg@^7.10.1 pg@^8.23.1 dotenv@^18.0.9 tsx@^4.23.15 \
 && rm -rf /root/.npm /root/.cache
COPY prisma ./prisma
COPY prisma.config.ts ./
COPY --from=builder /app/src/generated ./src/generated
# Сид импортирует общий модуль с данными; он использует только относительные импорты.
COPY src/lib/seed-demo.ts ./src/lib/seed-demo.ts

FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN useradd --system --uid 1001 app && mkdir -p /app/uploads && chown app /app/uploads
COPY --from=builder --chown=app /app/.next/standalone ./
COPY --from=builder --chown=app /app/.next/static ./.next/static
COPY --from=builder --chown=app /app/public ./public
USER app
EXPOSE 3000
CMD ["node", "server.js"]
