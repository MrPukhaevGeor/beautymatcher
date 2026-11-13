import { expect, test } from "@playwright/test";
import { noHorizontalScroll } from "./helpers";

// Работает и на телефоне, и на компьютере.
test.describe("публичные страницы", () => {
  for (const path of ["/", "/offers", "/for-providers", "/about", "/free/strizhka", "/login"]) {
    test(`${path}: открывается, есть демо-баннер и нет горизонтальной прокрутки`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("status").filter({ hasText: "Демо-версия" })).toBeVisible();
      await noHorizontalScroll(page);
    });
  }

  test("в подвале есть оговорка, что проект не сервис Правительства Москвы", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("contentinfo")).toContainText("Не является сервисом Правительства Москвы");
  });

  test("каталог фильтруется по услуге и показывает честную метку стоимости", async ({ page }) => {
    await page.goto("/offers?service=COLORING");
    await expect(page.getByText("Найдено предложений: 1")).toBeVisible();
    await expect(page.getByText("Только материалы, от 1200 ₽")).toBeVisible();
    await page.goto("/offers?service=LASHES");
    await expect(page.getByText("По этим условиям ничего не нашлось.")).toBeVisible();
  });

  test("демо запрещает индексацию", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /");
  });

  test("личные разделы без входа ведут на страницу входа", async ({ page }) => {
    for (const p of ["/cabinet", "/provider", "/admin"]) {
      await page.goto(p);
      await expect(page).toHaveURL(/\/login$/);
    }
    expect((await page.request.get("/admin/stats.csv")).status()).toBe(403);
    expect((await page.request.get("/api/photos/00000000-0000-0000-0000-000000000000.jpg")).status()).toBe(401);
  });
});
