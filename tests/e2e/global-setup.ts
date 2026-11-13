import "dotenv/config";
import { execSync } from "node:child_process";

// Приводит схему базы matcher_e2e к актуальной и заполняет её демо-данными перед каждым запуском.
// Без --force-reset: сид сам стирает строки, а полный сброс схемы здесь не нужен.
export default function globalSetup() {
  const url = (process.env.DATABASE_URL ?? "").replace(/\/matcher(\?|$)/, "/matcher_e2e$1");
  if (!url.includes("matcher_e2e")) throw new Error("Не удалось построить адрес базы matcher_e2e из DATABASE_URL");
  const env = { ...process.env, DATABASE_URL: url, DEMO_MODE: "true" };
  execSync("npx prisma db push", { env, stdio: "pipe" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "pipe" });
}
