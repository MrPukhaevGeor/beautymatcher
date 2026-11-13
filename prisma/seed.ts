// Заполняет базу вымышленными демо-данными. Стирает ВСЕ данные, при DEMO_MODE=false отказывается работать.
// Сама логика в src/lib/seed-demo.ts: её же использует маршрут ночного сброса.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { seedDemo } from "../src/lib/seed-demo";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

seedDemo(db)
  .then(async () => {
    console.log("Демо-данные созданы.");
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
