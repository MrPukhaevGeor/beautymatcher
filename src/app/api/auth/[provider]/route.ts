import { NextResponse } from "next/server";
import { isDemo } from "@/lib/demo";
import { authorizeUrl, isOAuthProvider, oauthKeys, pkcePair, randomState, siteUrl } from "@/lib/oauth";

export async function GET(_req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const back = (error: string) => NextResponse.redirect(new URL(`/login?error=${error}`, siteUrl()));

  if (!isOAuthProvider(provider)) return new Response("Не найдено", { status: 404 });
  if (isDemo()) return back("demo");
  if (!oauthKeys(provider)) return back("not-configured");

  const state = randomState();
  const { verifier, challenge } = pkcePair();
  const res = NextResponse.redirect(authorizeUrl(provider, state, challenge));
  res.cookies.set("bm_oauth", JSON.stringify({ state, verifier }), {
    httpOnly: true, sameSite: "lax", secure: siteUrl().startsWith("https://"), path: "/api/auth", maxAge: 600,
  });
  return res;
}
