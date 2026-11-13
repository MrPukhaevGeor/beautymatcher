"use server";

import { revalidatePath } from "next/cache";
import { AppError, changeStatus } from "@/lib/applications";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyStatusChanged } from "@/lib/notifications";

export async function cancelApplication(formData: FormData) {
  const user = await requireUser("MODEL");
  try {
    const id = String(formData.get("id") ?? "");
    await changeStatus({ applicationId: id, to: "CANCELLED", actor: "MODEL", actorUserId: user.id });
    await notifyStatusChanged(id);
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
  }
  revalidatePath("/cabinet");
}

export async function leaveReview(formData: FormData) {
  const user = await requireUser("MODEL");
  const applicationId = String(formData.get("id") ?? "");
  const rating = Number(formData.get("rating"));
  const text = String(formData.get("text") ?? "").slice(0, 1000);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return;

  // Отзыв можно оставить только по своей заявке со статусом «пришла», один раз.
  const app = await db.application.findFirst({
    where: { id: applicationId, modelId: user.id, status: "ATTENDED", review: null },
    select: { id: true },
  });
  if (!app) return;
  await db.review.create({ data: { applicationId: app.id, authorId: user.id, rating, text } });
  revalidatePath("/cabinet");
}
