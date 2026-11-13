import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db } from "@/lib/db";
import { savePhoto } from "@/lib/photos";

let currentUserId: string | null = null;
vi.mock("@/lib/auth", () => ({
  getCurrentUser: async () => (currentUserId ? db.user.findUnique({ where: { id: currentUserId } }) : null),
}));

// Импорт после vi.mock: маршрут подхватит подменённую авторизацию.
const { GET } = await import("@/app/api/photos/[name]/route");

const TAG = `ph-${Date.now()}`;
const ids: Record<"model" | "owner" | "stranger" | "admin", string> = { model: "", owner: "", stranger: "", admin: "" };
let photoName = "";

async function user(key: keyof typeof ids, role: "MODEL" | "PROVIDER" | "ADMIN") {
  const u = await db.user.create({
    data: { role, name: `${TAG}-${key}`, email: `${TAG}-${key}@example.invalid`, isAdult: true, isDemo: true },
  });
  ids[key] = u.id;
  return u;
}

beforeAll(async () => {
  const model = await user("model", "MODEL");
  const owner = await user("owner", "PROVIDER");
  await user("stranger", "PROVIDER");
  await user("admin", "ADMIN");

  const provider = await db.provider.create({
    data: { userId: owner.id, type: "SCHOOL", title: TAG, slug: TAG, district: "Тест", address: "тест", contact: "тест", status: "APPROVED", isDemo: true },
  });
  const offer = await db.offer.create({
    data: { providerId: provider.id, service: "HAIRCUT", title: TAG, priceMode: "FREE", status: "APPROVED", isDemo: true },
  });
  const slot = await db.slot.create({ data: { offerId: offer.id, startsAt: new Date(Date.now() + 86_400_000), capacity: 1 } });

  // Настоящее изображение с EXIF-данными: проверяем и сжатие, и удаление метаданных.
  const source = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#884466" } })
    .jpeg()
    .withExif({ IFD0: { Copyright: "секретные-данные-снимка" } })
    .toBuffer();
  photoName = await savePhoto(new File([new Uint8Array(source)], "hair.jpg", { type: "image/jpeg" }));

  await db.application.create({
    data: { slotId: slot.id, modelId: model.id, photoPath: photoName, ageConfirmed: true, isDemo: true },
  });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { name: { startsWith: TAG } } });
  await unlink(path.join(process.cwd(), "uploads", "applications", photoName)).catch(() => {});
  await db.$disconnect();
});

const get = (name = photoName) => GET(new Request("http://x/api/photos/" + name), { params: Promise.resolve({ name }) });

describe("фото заявки", () => {
  it("анониму не отдаётся", async () => {
    currentUserId = null;
    expect((await get()).status).toBe(401);
  });

  it("постороннему исполнителю не отдаётся", async () => {
    currentUserId = ids.stranger;
    expect((await get()).status).toBe(404);
  });

  it("автору, получателю и администратору отдаётся", async () => {
    for (const id of [ids.model, ids.owner, ids.admin]) {
      currentUserId = id;
      const res = await get();
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toContain("no-store");
    }
  });

  it("файл сжат до 1280 px и не содержит метаданных снимка", async () => {
    currentUserId = ids.admin;
    const buf = Buffer.from(await (await get()).arrayBuffer());
    const meta = await sharp(buf).metadata();
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(1280);
    expect(meta.exif).toBeUndefined();
    expect(buf.includes(Buffer.from("секретные-данные-снимка"))).toBe(false);
  });

  it("имя файла вне формата не открывается (защита от обхода каталога)", async () => {
    currentUserId = ids.admin;
    expect((await get("../../.env")).status).toBe(404);
  });

  it("не изображение отклоняется", async () => {
    await expect(savePhoto(new File(["не картинка"], "a.jpg", { type: "image/jpeg" }))).rejects.toThrow();
    await expect(savePhoto(new File(["x"], "a.txt", { type: "text/plain" }))).rejects.toThrow();
  });
});
