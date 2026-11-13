import { createHash, randomBytes } from "node:crypto";

// Вход через Яндекс и VK ID (код авторизации).
// НЕ ПРОВЕРЕНО НА РЕАЛЬНЫХ СЕРВИСАХ: нет ключей приложений. Адреса и поля ответов написаны по документации
// провайдеров и должны быть сверены при подключении. Пока ключи не заданы, вход отключён.

export type OAuthProvider = "vk" | "yandex";

export function isOAuthProvider(v: string): v is OAuthProvider {
  return v === "vk" || v === "yandex";
}

export function oauthKeys(p: OAuthProvider): { id: string; secret: string } | null {
  const id = p === "vk" ? process.env.VK_CLIENT_ID : process.env.YANDEX_CLIENT_ID;
  const secret = p === "vk" ? process.env.VK_CLIENT_SECRET : process.env.YANDEX_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
}

export function siteUrl(): string {
  return process.env.SITE_URL ?? "http://localhost:3000";
}

export function redirectUri(p: OAuthProvider): string {
  return `${siteUrl()}/api/auth/${p}/callback`;
}

export function pkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function randomState(): string {
  return randomBytes(16).toString("base64url");
}

export function authorizeUrl(p: OAuthProvider, state: string, challenge: string): string {
  const keys = oauthKeys(p);
  if (!keys) throw new Error("Ключи входа не заданы");
  if (p === "yandex") {
    const u = new URL("https://oauth.yandex.ru/authorize");
    u.search = new URLSearchParams({
      response_type: "code", client_id: keys.id, redirect_uri: redirectUri(p), state,
    }).toString();
    return u.toString();
  }
  const u = new URL("https://id.vk.com/authorize");
  u.search = new URLSearchParams({
    response_type: "code", client_id: keys.id, redirect_uri: redirectUri(p), state,
    code_challenge: challenge, code_challenge_method: "S256", scope: "email",
  }).toString();
  return u.toString();
}

export type OAuthProfile = { externalId: string; name: string };

async function postForm(url: string, body: Record<string, string>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  if (!res.ok) throw new Error(`OAuth: ${url} ответил ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

export async function fetchProfile(
  p: OAuthProvider,
  params: { code: string; state: string; verifier: string; deviceId: string | null },
): Promise<OAuthProfile> {
  const keys = oauthKeys(p);
  if (!keys) throw new Error("Ключи входа не заданы");

  if (p === "yandex") {
    const token = await postForm("https://oauth.yandex.ru/token", {
      grant_type: "authorization_code", code: params.code, client_id: keys.id, client_secret: keys.secret,
    });
    const info = await fetch("https://login.yandex.ru/info?format=json", {
      headers: { Authorization: `OAuth ${String(token.access_token)}` },
    });
    if (!info.ok) throw new Error(`OAuth: профиль Яндекса ${info.status}`);
    const j = (await info.json()) as { id?: string; display_name?: string; real_name?: string };
    if (!j.id) throw new Error("OAuth: у профиля Яндекса нет id");
    return { externalId: String(j.id), name: j.display_name || j.real_name || "Пользователь" };
  }

  if (!params.deviceId) throw new Error("OAuth: VK не передал device_id");
  const token = await postForm("https://id.vk.com/oauth2/auth", {
    grant_type: "authorization_code", code: params.code, code_verifier: params.verifier,
    client_id: keys.id, device_id: params.deviceId, redirect_uri: redirectUri(p), state: params.state,
  });
  const info = await postForm("https://id.vk.com/oauth2/user_info", {
    client_id: keys.id, access_token: String(token.access_token),
  });
  const u = (info.user ?? {}) as { user_id?: string | number; first_name?: string; last_name?: string };
  if (!u.user_id) throw new Error("OAuth: у профиля VK нет user_id");
  return { externalId: String(u.user_id), name: [u.first_name, u.last_name].filter(Boolean).join(" ") || "Пользователь" };
}
