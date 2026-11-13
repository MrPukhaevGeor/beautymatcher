import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "bm_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 14;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 24) throw new Error("SESSION_SECRET не задан или слишком короткий");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function encodeSession(userId: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: now + MAX_AGE_SEC * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof uid !== "string" || typeof exp !== "number" || exp < now) return null;
    return uid;
  } catch {
    return null;
  }
}

export async function startSession(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, encodeSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.SITE_URL ?? "").startsWith("https://"),
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function readSessionUserId(): Promise<string | null> {
  return decodeSession((await cookies()).get(COOKIE)?.value);
}
