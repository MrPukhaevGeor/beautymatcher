"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { homeFor, type Role } from "@/lib/auth";
import { demoAccountByKey, isDemo } from "@/lib/demo";
import { normalizeEmail, normalizePhone } from "@/lib/contacts";
import { issueCode, verifyCode } from "@/lib/login-codes";
import { endSession, startSession } from "@/lib/session";

export type LoginState = {
  step: "contact" | "code";
  channel?: "EMAIL" | "PHONE";
  target?: string;
  error?: string;
  info?: string;
};

export async function demoLogin(formData: FormData) {
  if (!isDemo()) redirect("/login");
  const account = demoAccountByKey(String(formData.get("key") ?? ""));
  if (!account) redirect("/login");
  const user = await db.user.findUnique({ where: { email: account.email } });
  if (!user) redirect("/login?demo=empty");
  await startSession(user.id);
  redirect(homeFor(user.role as Role));
}

export async function requestCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (isDemo()) {
    return { step: "contact", error: "Это демо-версия: вход по почте и телефону отключён. Используйте кнопки демо-входа выше." };
  }
  const channel = formData.get("channel") === "PHONE" ? "PHONE" : "EMAIL";
  const raw = String(formData.get("target") ?? "");
  const target = channel === "EMAIL" ? normalizeEmail(raw) : normalizePhone(raw);
  if (!target) {
    return { step: "contact", channel, error: channel === "EMAIL" ? "Проверьте адрес почты." : "Нужен российский номер, например +7 916 123-45-67." };
  }
  const res = await issueCode(channel, target);
  if (!res.ok) {
    return {
      step: "contact", channel,
      error: res.reason === "COOLDOWN" ? "Код уже отправлен. Повторить можно через минуту." : "Слишком много запросов. Попробуйте через час.",
    };
  }
  return { step: "code", channel, target, info: "Мы отправили шестизначный код." };
}

export async function confirmCode(prev: LoginState, formData: FormData): Promise<LoginState> {
  if (isDemo() || !prev.target || !prev.channel) return { step: "contact" };
  const res = await verifyCode(prev.target, String(formData.get("code") ?? ""));
  if (!res.ok) {
    const error =
      res.reason === "INVALID" ? "Код неверный."
      : res.reason === "LOCKED" ? "Слишком много неверных попыток. Запросите новый код."
      : "Код истёк или не запрошен. Запросите новый.";
    return { ...prev, error, info: undefined, step: res.reason === "INVALID" ? "code" : "contact" };
  }

  const where = prev.channel === "EMAIL" ? { email: prev.target } : { phone: prev.target };
  let user = await db.user.findUnique({ where });
  if (user?.blocked) return { step: "contact", error: "Аккаунт заблокирован." };
  if (!user) {
    user = await db.user.create({
      data: { ...where, role: "MODEL", name: prev.target.split("@")[0] || "Пользователь" },
    });
  }
  await startSession(user.id);
  redirect(homeFor(user.role as Role));
}

export async function logout() {
  await endSession();
  redirect("/");
}
