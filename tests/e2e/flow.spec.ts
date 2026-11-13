import { expect, test, type Page } from "@playwright/test";
import { loginAs } from "./helpers";

// Эти сценарии меняют данные и зависят друг от друга: только десктоп, строго по порядку.
test.describe.configure({ mode: "serial" });
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "сценарии со сменой данных идут только на десктопе");
});

async function applyTo(page: Page, catalogQuery: string, offerTitle: string) {
  await page.goto(`/offers?${catalogQuery}`);
  await page.getByRole("link", { name: offerTitle }).click();
  await page.getByRole("radio").first().check();
  await page.getByLabel("Мне исполнилось 18 лет").check();
  await page.getByRole("button", { name: "Отправить заявку" }).click();
  await expect(page.getByText("Заявка отправлена")).toBeVisible();
}

const appCard = (page: Page, who: string, offer: string) =>
  page.locator("li").filter({ hasText: who }).filter({ hasText: offer });

test("заявка проходит весь путь: подача, подтверждение, «пришла», отзыв, статистика", async ({ page }) => {
  await loginAs(page, "model");
  await applyTo(page, "service=COLORING", "Окрашивание в один тон");

  await page.goto("/cabinet");
  const mine = page.locator("li").filter({ hasText: "Окрашивание в один тон" });
  await expect(mine.getByText("На рассмотрении")).toBeVisible();

  await loginAs(page, "school");
  await page.goto("/provider");
  const incoming = appCard(page, "Мария (демо)", "Окрашивание в один тон");
  await incoming.getByRole("button", { name: "Подтвердить" }).click();
  await expect(incoming.getByText("Подтверждена")).toBeVisible();
  await incoming.getByRole("button", { name: "Пришла", exact: true }).click();
  await expect(incoming.getByText("Пришла", { exact: true })).toBeVisible();

  await loginAs(page, "model");
  await page.goto("/cabinet");
  const done = page.locator("li").filter({ hasText: "Окрашивание в один тон" });
  await done.getByLabel("Оценка").selectOption("4");
  await done.getByLabel("Отзыв", { exact: true }).fill("Хорошо, преподаватель рядом");
  await done.getByRole("button", { name: "Оставить отзыв" }).click();
  await expect(page.getByText("Ваш отзыв: ★★★★ Хорошо, преподаватель рядом")).toBeVisible();

  await page.goto("/providers/obrazets-demo");
  await expect(page.getByText("Хорошо, преподаватель рядом")).toBeVisible();

  await loginAs(page, "admin");
  await page.goto("/admin");
  await expect(page.getByText("Демонстрационные цифры. Использовать их в разговоре с городом нельзя.")).toBeVisible();
  const csv = await page.request.get("/admin/stats.csv");
  expect(csv.status()).toBe(200);
  const text = await csv.text();
  expect(text.startsWith("﻿")).toBe(true);
  expect(text).toContain("ДЕМО");
  expect(text).toContain('"Статус заявки","Пришла"');
});

test("адрес частного мастера скрыт, пока заявка не подтверждена", async ({ page }) => {
  await loginAs(page, "model");
  await page.goto("/providers/anna-demo");
  await expect(page.getByText("Откроются после подтверждения вашей заявки.")).toBeVisible();
  await expect(page.getByText("ул. Условная, 7")).toHaveCount(0);

  await applyTo(page, "service=MANICURE", "Маникюр для портфолио");
  await page.goto("/providers/anna-demo");
  await expect(page.getByText("ул. Условная, 7")).toHaveCount(0);

  await loginAs(page, "master");
  await page.goto("/provider");
  await appCard(page, "Мария (демо)", "Маникюр для портфолио").getByRole("button", { name: "Подтвердить" }).click();
  await expect(appCard(page, "Мария (демо)", "Маникюр для портфолио").getByText("Подтверждена")).toBeVisible();

  await loginAs(page, "model");
  await page.goto("/providers/anna-demo");
  await expect(page.getByText("ул. Условная, 7")).toBeVisible();
});

test("новое предложение не видно в каталоге, пока его не одобрит администратор", async ({ page }) => {
  const title = "Макияж для портфолио (автотест)";
  const when = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const local = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}T15:00`;

  await loginAs(page, "master");
  await page.goto("/provider");
  await page.getByLabel("Услуга").selectOption("MAKEUP");
  await page.getByLabel("Название предложения").fill(title);
  await page.locator('input[name="slot0"]').fill(local);
  await page.getByRole("button", { name: "Отправить на проверку" }).click();
  await expect(page.getByText("Сохранено. Ждёт проверки администратором.")).toBeVisible();

  await page.context().clearCookies();
  await page.goto("/offers?service=MAKEUP");
  await expect(page.getByText(title)).toHaveCount(0);

  await loginAs(page, "admin");
  await page.goto("/admin");
  await page.locator("li").filter({ hasText: title }).getByRole("button", { name: "Одобрить" }).click();
  await expect(page.getByText(title)).toHaveCount(0);

  await page.context().clearCookies();
  await page.goto("/offers?service=MAKEUP");
  await expect(page.getByText(title)).toBeVisible();
});
