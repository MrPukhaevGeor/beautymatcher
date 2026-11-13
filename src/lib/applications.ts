import { db } from "@/lib/db";
import { canTransition, OCCUPYING, type Actor, type Status } from "@/lib/statuses";

export class AppError extends Error {
  constructor(
    public code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "BAD_TRANSITION"
      | "NO_CAPACITY"
      | "ALREADY_APPLIED"
      | "SLOT_PAST"
      | "NOT_ADULT",
    message: string,
  ) {
    super(message);
  }
}

export async function createApplication(input: {
  modelId: string;
  slotId: string;
  comment: string;
  photoPath: string | null;
  ageConfirmed: boolean;
  isDemo: boolean;
}) {
  if (!input.ageConfirmed) throw new AppError("NOT_ADULT", "Сервис только для совершеннолетних");

  const slot = await db.slot.findUnique({
    where: { id: input.slotId },
    include: { offer: { include: { provider: true } } },
  });
  if (!slot || slot.offer.status !== "APPROVED" || slot.offer.provider.status !== "APPROVED") {
    throw new AppError("NOT_FOUND", "Предложение недоступно");
  }
  if (slot.startsAt.getTime() < Date.now()) throw new AppError("SLOT_PAST", "Эта дата уже прошла");

  try {
    return await db.application.create({
      data: {
        slotId: input.slotId,
        modelId: input.modelId,
        comment: input.comment.slice(0, 1000),
        photoPath: input.photoPath,
        ageConfirmed: true,
        isDemo: input.isDemo,
      },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      throw new AppError("ALREADY_APPLIED", "Вы уже подали заявку на эту дату");
    }
    throw e;
  }
}

/**
 * Меняет статус заявки. Подтверждение идёт в транзакции с блокировкой строки даты,
 * поэтому две одновременные заявки не займут последнее место вдвоём.
 */
export async function changeStatus(input: {
  applicationId: string;
  to: Status;
  actor: Actor;
  actorUserId: string;
}) {
  return db.$transaction(async (tx) => {
    const app = await tx.application.findUnique({
      where: { id: input.applicationId },
      include: { slot: { include: { offer: { include: { provider: true } } } } },
    });
    if (!app) throw new AppError("NOT_FOUND", "Заявка не найдена");

    const ownerId = app.slot.offer.provider.userId;
    const isOwner = input.actor === "PROVIDER" ? ownerId === input.actorUserId : app.modelId === input.actorUserId;
    if (!isOwner) throw new AppError("FORBIDDEN", "Нет доступа к этой заявке");

    if (!canTransition(app.status as Status, input.to, input.actor)) {
      throw new AppError("BAD_TRANSITION", "Так менять статус нельзя");
    }

    if (input.to === "CONFIRMED") {
      await tx.$queryRaw`SELECT id FROM "Slot" WHERE id = ${app.slotId} FOR UPDATE`;
      const taken = await tx.application.count({
        where: { slotId: app.slotId, status: { in: OCCUPYING } },
      });
      if (taken >= app.slot.capacity) throw new AppError("NO_CAPACITY", "На эту дату мест больше нет");
    }

    return tx.application.update({ where: { id: app.id }, data: { status: input.to } });
  });
}
