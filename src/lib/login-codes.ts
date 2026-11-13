import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { sendEmail, sendSms } from "@/lib/notify";

const TTL_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_PER_HOUR = 5;

type Channel = "EMAIL" | "PHONE";

function hash(code: string, target: string): string {
  return createHmac("sha256", process.env.SESSION_SECRET ?? "").update(`${target}:${code}`).digest("hex");
}

export type IssueResult = { ok: true } | { ok: false; reason: "COOLDOWN" | "TOO_MANY" };

export async function issueCode(channel: Channel, target: string): Promise<IssueResult> {
  const now = Date.now();
  const recent = await db.loginCode.findMany({
    where: { target, createdAt: { gt: new Date(now - 60 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
  });
  if (recent[0] && now - recent[0].createdAt.getTime() < COOLDOWN_MS) return { ok: false, reason: "COOLDOWN" };
  if (recent.length >= MAX_PER_HOUR) return { ok: false, reason: "TOO_MANY" };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.loginCode.create({
    data: { channel, target, codeHash: hash(code, target), expiresAt: new Date(now + TTL_MS) },
  });

  const text = `Код входа в «Красота рядом»: ${code}. Действует 10 минут. Никому его не сообщайте.`;
  if (channel === "EMAIL") await sendEmail(target, "Код входа", text);
  else await sendSms(target, text);
  return { ok: true };
}

export type VerifyResult = { ok: true } | { ok: false; reason: "INVALID" | "EXPIRED" | "LOCKED" };

export async function verifyCode(target: string, code: string): Promise<VerifyResult> {
  const row = await db.loginCode.findFirst({
    where: { target, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!row || row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "EXPIRED" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "LOCKED" };

  const given = Buffer.from(hash(code.trim(), target));
  const expected = Buffer.from(row.codeHash);
  const match = given.length === expected.length && timingSafeEqual(given, expected);

  if (!match) {
    await db.loginCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, reason: "INVALID" };
  }
  await db.loginCode.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  return { ok: true };
}
