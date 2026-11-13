import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// Сброс стирает всю базу, поэтому тест работает только с отдельной базой matcher_e2e, не с dev-данными.
const e2eUrl = (process.env.DATABASE_URL ?? "").replace(/\/matcher(\?|$)/, "/matcher_e2e$1");
if (!e2eUrl.includes("matcher_e2e")) throw new Error("Не удалось построить адрес базы matcher_e2e из DATABASE_URL");
process.env.DATABASE_URL = e2eUrl;

const SECRET = "test-cron-secret-test-cron-secret";
const { db } = await import("@/lib/db");
const { GET } = await import("@/app/api/cron/reset/route");

const TAG = `cron-${Date.now()}`;

const call = (headers: Record<string, string> = {}) =>
  GET(new Request("http://x/api/cron/reset", { headers }));

async function plantJunk() {
  await db.user.create({ data: { role: "MODEL", name: TAG, email: `${TAG}@example.invalid`, isDemo: true } });
}
const junkExists = async () => (await db.user.count({ where: { name: TAG } })) > 0;

beforeAll(() => {
  process.env.DEMO_MODE = "true";
});
beforeEach(async () => {
  process.env.CRON_SECRET = SECRET;
  process.env.DEMO_MODE = "true";
  await db.user.deleteMany({ where: { name: TAG } });
  await plantJunk();
});
afterAll(async () => {
  await db.user.deleteMany({ where: { name: TAG } });
  await db.$disconnect();
});

describe("маршрут ночного сброса", () => {
  it("без заголовка авторизации отвечает 401 и ничего не стирает", async () => {
    expect((await call()).status).toBe(401);
    expect(await junkExists()).toBe(true);
  });

  it("с неверным секретом отвечает 401, даже если длина совпадает", async () => {
    const sameLength = `Bearer ${"x".repeat(SECRET.length)}`;
    expect((await call({ authorization: sameLength })).status).toBe(401);
    expect((await call({ authorization: "Bearer short" })).status).toBe(401);
    expect((await call({ authorization: SECRET })).status).toBe(401); // без слова Bearer
    expect(await junkExists()).toBe(true);
  });

  it("если CRON_SECRET не задан, не пускает никого, даже с пустым значением", async () => {
    delete process.env.CRON_SECRET;
    expect((await call()).status).toBe(401);
    expect((await call({ authorization: "Bearer " })).status).toBe(401);
    expect((await call({ authorization: "Bearer undefined" })).status).toBe(401);
    expect(await junkExists()).toBe(true);
  });

  it("при DEMO_MODE=false отвечает 403 и ничего не стирает, даже с верным секретом", async () => {
    process.env.DEMO_MODE = "false";
    const res = await call({ authorization: `Bearer ${SECRET}` });
    expect(res.status).toBe(403);
    expect(await junkExists()).toBe(true);
  });

  it("с верным секретом в демо-режиме стирает посторонние данные и создаёт демо-набор", async () => {
    const res = await call({ authorization: `Bearer ${SECRET}` });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);

    expect(await junkExists()).toBe(false);
    expect(await db.user.count()).toBe(6);
    expect(await db.provider.count({ where: { status: "APPROVED" } })).toBe(3);
    expect(await db.provider.count({ where: { status: "PENDING" } })).toBe(1);
    expect(await db.offer.count()).toBe(6);
    expect(await db.review.count()).toBe(1);
  });

  it("повторный сброс даёт тот же результат (идемпотентен)", async () => {
    await call({ authorization: `Bearer ${SECRET}` });
    await call({ authorization: `Bearer ${SECRET}` });
    expect(await db.user.count()).toBe(6);
    expect(await db.offer.count()).toBe(6);
  });
});
