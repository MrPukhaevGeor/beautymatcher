// Демо-режим: настоящие данные не собираются, индексация запрещена.
// Включается переменной DEMO_MODE=true (по умолчанию включён: безопаснее ошибиться в эту сторону).

export function isDemo(): boolean {
  return process.env.DEMO_MODE !== "false";
}

export const DEMO_BANNER = "Демо-версия: настоящие заявки не принимаются. Не вводите реальные данные.";

export const DEMO_ACCOUNTS = [
  { key: "model", label: "Войти как модель", email: "demo-model@example.invalid" },
  { key: "school", label: "Войти как школа", email: "demo-school@example.invalid" },
  { key: "master", label: "Войти как частный мастер", email: "demo-master@example.invalid" },
  { key: "admin", label: "Войти как администратор", email: "demo-admin@example.invalid" },
] as const;

export type DemoAccountKey = (typeof DEMO_ACCOUNTS)[number]["key"];

export function demoAccountByKey(key: string) {
  return DEMO_ACCOUNTS.find((a) => a.key === key) ?? null;
}
