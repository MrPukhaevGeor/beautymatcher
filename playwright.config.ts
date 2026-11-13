import "dotenv/config";
import { defineConfig } from "@playwright/test";

// Сквозные тесты идут в отдельную базу matcher_e2e и на порту 3101,
// чтобы не трогать dev-данные и чужие приложения на других портах.
const E2E_DB = (process.env.DATABASE_URL ?? "").replace(/\/matcher(\?|$)/, "/matcher_e2e$1");
const PORT = 3101;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  // Сценарии зависят от общих данных, поэтому идут строго по очереди.
  workers: 1,
  // Dev-сервер компилирует страницы и действия при первом обращении, поэтому запас по времени большой.
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, channel: "msedge", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: false } },
  ],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { DATABASE_URL: E2E_DB, DEMO_MODE: "true", SITE_URL: `http://localhost:${PORT}`, NEXT_DIST_DIR: ".next-e2e" },
  },
});
