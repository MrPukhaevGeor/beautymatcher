// Один раз применяет схему и демо-данные к базе Neon с этого компьютера (без Docker).
// Адрес базы берётся из файла .env.neon: строка DATABASE_URL_UNPOOLED=... (или DATABASE_URL=...).
// Значение в чат не присылайте. Сид стирает все строки, поэтому скрипт отказывается работать
// с локальной, внутренней или нерелевантной базой, а также с адресом через пул подключений.
//
//   node deploy/remote-init.mjs [путь-к-файлу]            применить схему и демо-данные
//   node deploy/remote-init.mjs [путь-к-файлу] --dry-run  только проверить файл, ничего не применяя
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function fail(message) {
  console.error(`Остановлено: ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const file = args.find((a) => !a.startsWith("--")) ?? ".env.neon";
if (!existsSync(file)) {
  fail(`нет файла ${file}. Создайте его из одной строки: DATABASE_URL_UNPOOLED=<значение из Vercel или Neon>`);
}

const lines = readFileSync(file, "utf8").split(/\r?\n/);
const pick = (key) => lines.find((l) => l.startsWith(`${key}=`))?.slice(key.length + 1);
const raw = pick("DATABASE_URL_UNPOOLED") ?? pick("DATABASE_URL");
if (!raw) fail(`в ${file} нет строки DATABASE_URL_UNPOOLED=... или DATABASE_URL=...`);

let parsed;
try {
  parsed = new URL(raw.trim().replace(/^["']|["']$/g, ""));
} catch {
  fail("значение не похоже на адрес базы данных");
}

const host = parsed.hostname;
if (["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(host)) {
  fail(`хост ${host} локальный. Скрипт предназначен только для базы Neon: сид стёр бы данные.`);
}
if (!/\.neon\.tech$/.test(host)) {
  fail(`хост ${host} не похож на Neon (ожидается *.neon.tech). Проверьте значение.`);
}
if (host.split(".")[0].endsWith("-pooler")) {
  fail("это адрес через пул подключений (в имени хоста есть -pooler). Для схемы нужен прямой адрес: DATABASE_URL_UNPOOLED.");
}

// Neon принимает только TLS: если режим не указан, задаём его сами.
if (!parsed.searchParams.has("sslmode")) parsed.searchParams.set("sslmode", "require");

if (dryRun) {
  console.log(`Проверка пройдена: хост ${host}, sslmode=${parsed.searchParams.get("sslmode")}. Ничего не применялось (--dry-run).`);
  process.exit(0);
}

console.log(`База: ${host} (пароль не показываю). Применяю схему и демо-данные...`);

// DATABASE_URL, заданный здесь, имеет приоритет над .env: dotenv не перезаписывает существующие переменные.
const env = { ...process.env, DATABASE_URL: parsed.toString(), DEMO_MODE: "true" };

for (const cmd of [["prisma", "db", "push"], ["tsx", "prisma/seed.ts"]]) {
  const res = spawnSync("npx", cmd, { env, stdio: "inherit", shell: true });
  if (res.status !== 0) fail(`команда «npx ${cmd.join(" ")}» завершилась с ошибкой (код ${res.status}).`);
}
console.log("Готово: схема применена, демо-данные созданы.");
