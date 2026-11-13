import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { homeFor, type Role } from "@/lib/auth";
import { db } from "@/lib/db";
import { isDemo } from "@/lib/demo";
import { fetchProfile, isOAuthProvider, siteUrl } from "@/lib/oauth";
import { startSession } from "@/lib/session";

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const back = (error: string) => NextResponse.redirect(new URL(`/login?error=${error}`, siteUrl()));

  if (!isOAuthProvider(provider)) return new Response("Не найдено", { status: 404 });
  if (isDemo()) return back("demo");

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  let saved: { state?: string; verifier?: string } = {};
  try {
    saved = JSON.parse(jar.get("bm_oauth")?.value ?? "{}");
  } catch {
    // повреждённая cookie: ниже проверка state не пройдёт
  }
  jar.delete("bm_oauth");
  if (!code || !state || !saved.state || saved.state !== state || !saved.verifier) return back("state");

  let profile;
  try {
    profile = await fetchProfile(provider, {
      code, state, verifier: saved.verifier, deviceId: url.searchParams.get("device_id"),
    });
  } catch (e) {
    console.error("[oauth]", e);
    return back("provider");
  }

  // Связываем только по id у провайдера. По почте не связываем: так нельзя занять чужой аккаунт.
  const where = provider === "vk" ? { vkId: profile.externalId } : { yandexId: profile.externalId };
  let user = await db.user.findUnique({ where });
  if (user?.blocked) return back("blocked");
  if (!user) user = await db.user.create({ data: { ...where, role: "MODEL", name: profile.name } });

  await startSession(user.id);
  return NextResponse.redirect(new URL(homeFor(user.role as Role), siteUrl()));
}
