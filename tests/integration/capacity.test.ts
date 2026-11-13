import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { AppError, changeStatus, createApplication } from "@/lib/applications";

// Ходит в реальную dev-базу. Создаёт свои данные с префиксом и удаляет их в конце.
const TAG = `it-${Date.now()}`;

let providerUserId: string;
let slotId: string;
const modelIds: string[] = [];

beforeAll(async () => {
  const pu = await db.user.create({
    data: { role: "PROVIDER", name: TAG, email: `${TAG}-p@example.invalid`, isAdult: true, isDemo: true },
  });
  providerUserId = pu.id;
  const provider = await db.provider.create({
    data: {
      userId: pu.id, type: "SCHOOL", title: TAG, slug: TAG, district: "Тест", address: "тест",
      contact: "тест", status: "APPROVED", isDemo: true,
    },
  });
  const offer = await db.offer.create({
    data: { providerId: provider.id, service: "HAIRCUT", title: TAG, priceMode: "FREE", status: "APPROVED", isDemo: true },
  });
  const slot = await db.slot.create({
    data: { offerId: offer.id, startsAt: new Date(Date.now() + 86_400_000), capacity: 1 },
  });
  slotId = slot.id;

  for (let i = 0; i < 4; i++) {
    const m = await db.user.create({
      data: { role: "MODEL", name: `${TAG}-m${i}`, email: `${TAG}-m${i}@example.invalid`, isAdult: true, isDemo: true },
    });
    modelIds.push(m.id);
  }
});

afterAll(async () => {
  await db.user.deleteMany({ where: { name: { startsWith: TAG } } });
  await db.$disconnect();
});

describe("места на дату", () => {
  it("при одновременном подтверждении занимается ровно одно место из одного", async () => {
    const apps = await Promise.all(
      modelIds.map((modelId) =>
        createApplication({ modelId, slotId, comment: "", photoPath: null, ageConfirmed: true, isDemo: true }),
      ),
    );

    const results = await Promise.allSettled(
      apps.map((a) =>
        changeStatus({ applicationId: a.id, to: "CONFIRMED", actor: "PROVIDER", actorUserId: providerUserId }),
      ),
    );

    const ok = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

    expect(ok).toHaveLength(1);
    expect(rejected).toHaveLength(3);
    for (const r of rejected) {
      expect(r.reason).toBeInstanceOf(AppError);
      expect((r.reason as AppError).code).toBe("NO_CAPACITY");
    }

    const confirmed = await db.application.count({ where: { slotId, status: "CONFIRMED" } });
    expect(confirmed).toBe(1);
  });

  it("повторная заявка той же модели на ту же дату отклоняется", async () => {
    await expect(
      createApplication({ modelId: modelIds[0], slotId, comment: "", photoPath: null, ageConfirmed: true, isDemo: true }),
    ).rejects.toMatchObject({ code: "ALREADY_APPLIED" });
  });

  it("без подтверждения возраста заявка не создаётся", async () => {
    const extra = await db.user.create({
      data: { role: "MODEL", name: `${TAG}-noage`, email: `${TAG}-noage@example.invalid`, isDemo: true },
    });
    await expect(
      createApplication({ modelId: extra.id, slotId, comment: "", photoPath: null, ageConfirmed: false, isDemo: true }),
    ).rejects.toMatchObject({ code: "NOT_ADULT" });
  });

  it("чужой исполнитель не может подтвердить заявку", async () => {
    const stranger = await db.user.create({
      data: { role: "PROVIDER", name: `${TAG}-stranger`, email: `${TAG}-s@example.invalid`, isAdult: true, isDemo: true },
    });
    const app = await db.application.findFirstOrThrow({ where: { slotId, status: "PENDING" } });
    await expect(
      changeStatus({ applicationId: app.id, to: "CONFIRMED", actor: "PROVIDER", actorUserId: stranger.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
