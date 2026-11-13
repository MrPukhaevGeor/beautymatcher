"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AppError, changeStatus } from "@/lib/applications";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DISTRICTS } from "@/lib/labels";
import { notifyStatusChanged } from "@/lib/notifications";
import { makeSlug } from "@/lib/slug";
import type { Status } from "@/lib/statuses";

export type FormState = { ok?: boolean; error?: string };

const registerSchema = z.object({
  type: z.enum(["SCHOOL", "COLLEGE", "ACADEMY", "SALON", "PRIVATE_MASTER"]),
  title: z.string().trim().min(3, "Укажите название").max(120),
  description: z.string().trim().max(1500),
  district: z.enum(DISTRICTS),
  metro: z.string().trim().max(60),
  address: z.string().trim().min(5, "Укажите адрес").max(200),
  contact: z.string().trim().min(5, "Укажите контакт для связи").max(200),
});

export async function registerProvider(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.role === "ADMIN") return { error: "Администратор не может быть исполнителем." };
  if (user.provider) return { error: "Профиль уже создан." };

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля формы." };
  const d = parsed.data;

  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { role: "PROVIDER" } }),
    db.provider.create({
      data: {
        userId: user.id, type: d.type, title: d.title, slug: makeSlug(d.title), description: d.description,
        district: d.district, metro: d.metro || null, address: d.address, contact: d.contact,
        status: "PENDING", isDemo: user.isDemo,
      },
    }),
  ]);
  revalidatePath("/provider");
  return { ok: true };
}

const offerSchema = z.object({
  service: z.enum(["HAIRCUT", "COLORING", "STYLING", "MANICURE", "PEDICURE", "BROWS", "LASHES", "MAKEUP"]),
  title: z.string().trim().min(5, "Название слишком короткое").max(120),
  description: z.string().trim().max(1500),
  priceMode: z.enum(["FREE", "MATERIALS_ONLY"]),
  materialsFrom: z.string().trim(),
});

export async function createOffer(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("PROVIDER");
  if (!user.provider || user.provider.status !== "APPROVED") return { error: "Профиль ещё не прошёл проверку." };

  const parsed = offerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля формы." };
  const d = parsed.data;

  let materialsFrom: number | null = null;
  if (d.priceMode === "MATERIALS_ONLY") {
    materialsFrom = Number(d.materialsFrom);
    if (!Number.isInteger(materialsFrom) || materialsFrom < 0 || materialsFrom > 100000) {
      return { error: "Укажите сумму материалов в рублях, например 1200." };
    }
  }

  // Даты вводятся по московскому времени.
  const slots: { startsAt: Date; capacity: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const when = String(formData.get(`slot${i}`) ?? "");
    if (!when) continue;
    const startsAt = new Date(`${when}:00+03:00`);
    const capacity = Number(formData.get(`seats${i}`) || 1);
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now()) return { error: "Дата должна быть в будущем." };
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20) return { error: "Мест на дату от 1 до 20." };
    slots.push({ startsAt, capacity });
  }
  if (slots.length === 0) return { error: "Добавьте хотя бы одну дату." };

  await db.offer.create({
    data: {
      providerId: user.provider.id, service: d.service, title: d.title, description: d.description,
      priceMode: d.priceMode, materialsFrom, status: "PENDING", isDemo: user.isDemo,
      slots: { create: slots },
    },
  });
  revalidatePath("/provider");
  return { ok: true };
}

const ALLOWED: Status[] = ["CONFIRMED", "DECLINED", "CANCELLED", "ATTENDED", "NO_SHOW"];

export async function setApplicationStatus(formData: FormData) {
  const user = await requireUser("PROVIDER");
  const to = String(formData.get("to")) as Status;
  const id = String(formData.get("id") ?? "");
  if (!ALLOWED.includes(to)) return;
  try {
    await changeStatus({ applicationId: id, to, actor: "PROVIDER", actorUserId: user.id });
    await notifyStatusChanged(id);
  } catch (e) {
    // Бизнес-ошибки (нет мест, чужая заявка) просто не меняют страницу; остальное пробрасываем.
    if (!(e instanceof AppError)) throw e;
  }
  revalidatePath("/provider");
}
