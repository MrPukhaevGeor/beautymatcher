import { expect, type Page } from "@playwright/test";

export type Demo = "model" | "school" | "master" | "admin";

export async function loginAs(page: Page, who: Demo) {
  await page.context().clearCookies();
  await page.goto("/login");
  const label = { model: "модель", school: "школа", master: "частный мастер", admin: "администратор" }[who];
  await page.getByRole("button", { name: `Войти как ${label}` }).click();
  await expect(page.getByRole("button", { name: "Выйти" })).toBeVisible();
}

export async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}
