import { afterAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { issueCode, verifyCode } from "@/lib/login-codes";

const sent: string[] = [];
vi.mock("@/lib/notify", () => ({
  sendEmail: async (_to: string, _subject: string, text: string) => void sent.push(text),
  sendSms: async (_to: string, text: string) => void sent.push(text),
}));

const target = `it-${Date.now()}@example.invalid`;

afterAll(async () => {
  await db.loginCode.deleteMany({ where: { target } });
  await db.$disconnect();
});

function lastCode(): string {
  const m = sent.at(-1)?.match(/\d{6}/);
  if (!m) throw new Error("код не найден в сообщении");
  return m[0];
}

describe("коды входа", () => {
  it("верный код принимается один раз", async () => {
    expect(await issueCode("EMAIL", target)).toEqual({ ok: true });
    const code = lastCode();
    expect(await verifyCode(target, code)).toEqual({ ok: true });
    expect(await verifyCode(target, code)).toMatchObject({ ok: false });
  });

  it("второй код раньше чем через минуту не выдаётся", async () => {
    expect(await issueCode("EMAIL", target)).toEqual({ ok: false, reason: "COOLDOWN" });
  });

  it("после 5 неверных попыток код блокируется, даже если потом ввести верный", async () => {
    await db.loginCode.deleteMany({ where: { target } });
    expect(await issueCode("EMAIL", target)).toEqual({ ok: true });
    const code = lastCode();
    const wrong = code === "000000" ? "111111" : "000000";

    for (let i = 0; i < 5; i++) {
      expect(await verifyCode(target, wrong)).toEqual({ ok: false, reason: "INVALID" });
    }
    expect(await verifyCode(target, code)).toEqual({ ok: false, reason: "LOCKED" });
  });

  it("просроченный код не принимается", async () => {
    await db.loginCode.deleteMany({ where: { target } });
    await issueCode("EMAIL", target);
    const code = lastCode();
    await db.loginCode.updateMany({ where: { target }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await verifyCode(target, code)).toEqual({ ok: false, reason: "EXPIRED" });
  });
});
