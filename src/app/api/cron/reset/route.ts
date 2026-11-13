import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { isDemo } from "@/lib/demo";
import { seedDemo } from "@/lib/seed-demo";

// Ночной сброс демо-данных. Vercel Cron вызывает этот адрес и сам передаёт заголовок
// Authorization: Bearer <CRON_SECRET>, если переменная CRON_SECRET задана в проекте.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Секрет не задан: считаем запрос неавторизованным, а не пропускаем всех.
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  // Стирает всю базу, поэтому только в демо-режиме.
  if (!isDemo()) return Response.json({ ok: false, error: "DEMO_MODE выключен: сброс запрещён" }, { status: 403 });

  await seedDemo(db);
  return Response.json({ ok: true, resetAt: new Date().toISOString() });
}
