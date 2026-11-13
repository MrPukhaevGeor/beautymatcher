// Вымышленные демо-данные. Все названия и люди придуманы; совпадения случайны.
// Модуль общий для prisma/seed.ts (командная строка) и маршрута ночного сброса /api/cron/reset.
// Только относительные импорты: его копирует в служебный образ без tsconfig и алиасов.
import type { PrismaClient } from "../generated/prisma/client";

const DAY = 24 * 60 * 60 * 1000;

// Время задаётся по Москве (UTC+3), а не по часовому поясу машины: в контейнере и на сервере он UTC.
function at(daysAhead: number, hourMoscow: number) {
  const d = new Date(Date.now() + daysAhead * DAY);
  d.setUTCHours(hourMoscow - 3, 0, 0, 0);
  return d;
}

/**
 * Стирает ВСЕ данные и создаёт демо-набор заново, одной транзакцией:
 * посетители видят либо старые данные, либо новые, а сбой посередине ничего не стирает.
 * При DEMO_MODE=false отказывается работать: защита от стирания настоящих данных.
 */
export async function seedDemo(db: PrismaClient) {
  if (process.env.DEMO_MODE === "false") {
    throw new Error("DEMO_MODE=false: сброс базы запрещён. Это защита от стирания настоящих данных.");
  }

  await db.$transaction(
    async (tx) => {
      await tx.review.deleteMany();
      await tx.application.deleteMany();
      await tx.slot.deleteMany();
      await tx.offer.deleteMany();
      await tx.provider.deleteMany();
      await tx.loginCode.deleteMany();
      await tx.user.deleteMany();

      const admin = await tx.user.create({
        data: { role: "ADMIN", name: "Администратор (демо)", email: "demo-admin@example.invalid", isAdult: true, isDemo: true },
      });
      const model = await tx.user.create({
        data: { role: "MODEL", name: "Мария (демо)", email: "demo-model@example.invalid", isAdult: true, isDemo: true },
      });
      const schoolUser = await tx.user.create({
        data: { role: "PROVIDER", name: "Школа «Образец» (демо)", email: "demo-school@example.invalid", isAdult: true, isDemo: true },
      });
      const masterUser = await tx.user.create({
        data: { role: "PROVIDER", name: "Анна, мастер (демо)", email: "demo-master@example.invalid", isAdult: true, isDemo: true },
      });
      const collegeUser = await tx.user.create({
        data: { role: "PROVIDER", name: "Колледж «Пример-Сервис» (демо)", email: "demo-college@example.invalid", isAdult: true, isDemo: true },
      });
      void admin;

      const school = await tx.provider.create({
        data: {
          userId: schoolUser.id, type: "SCHOOL", title: "Школа парикмахеров «Образец» (демо)", slug: "obrazets-demo",
          description: "Вымышленная школа для демонстрации. Практика студентов под присмотром преподавателя.",
          district: "Центральный", metro: "Тестовая", address: "ул. Примерная, 1 (вымышленный адрес)",
          contact: "demo@example.invalid", status: "APPROVED", isDemo: true,
        },
      });
      const college = await tx.provider.create({
        data: {
          userId: collegeUser.id, type: "COLLEGE", title: "Колледж «Пример-Сервис» (демо)", slug: "primer-servis-demo",
          description: "Вымышленный колледж. Студенты выполняют задания по программе, мастер контролирует результат.",
          district: "Южный", metro: "Учебная", address: "пр. Образцовый, 12 (вымышленный адрес)",
          contact: "demo@example.invalid", status: "APPROVED", isDemo: true,
        },
      });
      const master = await tx.provider.create({
        data: {
          userId: masterUser.id, type: "PRIVATE_MASTER", title: "Анна, мастер маникюра (демо)", slug: "anna-demo",
          description: "Вымышленный частный мастер. Берёт моделей для портфолио.",
          district: "Северный", metro: "Тестовая", address: "ул. Условная, 7 (вымышленный адрес)",
          contact: "demo@example.invalid", status: "APPROVED", isDemo: true,
        },
      });

      type OfferSeed = {
        providerId: string; service: "HAIRCUT" | "COLORING" | "MANICURE" | "BROWS" | "LASHES" | "MAKEUP" | "STYLING";
        title: string; description: string; priceMode: "FREE" | "MATERIALS_ONLY"; materialsFrom?: number;
        slots: [number, number, number][];
      };
      const offers: OfferSeed[] = [
        { providerId: school.id, service: "HAIRCUT", title: "Женская стрижка на практике студентов",
          description: "Стрижка средней длины. Нужны волосы от 15 см. Занимает около 2 часов.", priceMode: "FREE",
          slots: [[3, 11, 3], [5, 11, 3], [9, 14, 2]] },
        { providerId: school.id, service: "COLORING", title: "Окрашивание в один тон",
          description: "Окрашивание корней или по длине. Платите только за краску.", priceMode: "MATERIALS_ONLY", materialsFrom: 1200,
          slots: [[4, 10, 2], [8, 10, 2]] },
        { providerId: college.id, service: "HAIRCUT", title: "Мужская стрижка (практика студентов)",
          description: "Классическая стрижка машинкой и ножницами.", priceMode: "FREE",
          slots: [[2, 12, 4], [6, 12, 4]] },
        { providerId: college.id, service: "STYLING", title: "Вечерняя укладка", description: "Укладка феном и плойкой.", priceMode: "FREE",
          slots: [[7, 15, 2]] },
        { providerId: master.id, service: "MANICURE", title: "Маникюр для портфолио",
          description: "Классический маникюр с покрытием. Материалы оплачиваются отдельно.", priceMode: "MATERIALS_ONLY", materialsFrom: 400,
          slots: [[3, 17, 1], [5, 17, 1], [10, 17, 1]] },
        { providerId: master.id, service: "BROWS", title: "Коррекция и окрашивание бровей", description: "Для портфолио, около 1 часа.", priceMode: "FREE",
          slots: [[4, 18, 1]] },
      ];

      for (const o of offers) {
        await tx.offer.create({
          data: {
            providerId: o.providerId, service: o.service, title: o.title, description: o.description,
            priceMode: o.priceMode, materialsFrom: o.materialsFrom ?? null, status: "APPROVED", isDemo: true,
            slots: { create: o.slots.map(([d, h, capacity]) => ({ startsAt: at(d, h), capacity })) },
          },
        });
      }

      // Одно ожидающее предложение и один ожидающий исполнитель: чтобы в админке было что проверять.
      const pendingUser = await tx.user.create({
        data: { role: "PROVIDER", name: "Студия «Новичок» (демо)", email: "demo-pending@example.invalid", isAdult: true, isDemo: true },
      });
      await tx.provider.create({
        data: {
          userId: pendingUser.id, type: "SALON", title: "Студия «Новичок» (демо)", slug: "novichok-demo",
          description: "Ожидает проверки.", district: "Западный", address: "ул. Новая, 3 (вымышленный адрес)",
          contact: "demo@example.invalid", status: "PENDING", isDemo: true,
        },
      });

      // Заявки модели: одна ожидает, одна прошла с отзывом, чтобы статистика не была пустой.
      const firstSlot = await tx.slot.findFirstOrThrow({
        where: { offer: { providerId: school.id, service: "HAIRCUT" } }, orderBy: { startsAt: "asc" },
      });
      await tx.application.create({
        data: { slotId: firstSlot.id, modelId: model.id, comment: "Волосы до плеч, хочу освежить форму.", ageConfirmed: true, isDemo: true },
      });

      const collegeHaircut = await tx.offer.findFirstOrThrow({ where: { providerId: college.id, service: "HAIRCUT" } });
      const pastSlot = await tx.slot.create({ data: { offerId: collegeHaircut.id, startsAt: at(-5, 12), capacity: 4 } });
      const done = await tx.application.create({
        data: { slotId: pastSlot.id, modelId: model.id, status: "ATTENDED", comment: "Спасибо!", ageConfirmed: true, isDemo: true },
      });
      await tx.review.create({
        data: { applicationId: done.id, authorId: model.id, rating: 5, text: "Аккуратно, преподаватель всё проверял. Рекомендую." },
      });
    },
    // Интерактивная транзакция Prisma по умолчанию живёт 5 с; на удалённой базе с задержкой этого может не хватить.
    { timeout: 30_000, maxWait: 10_000 },
  );
}
