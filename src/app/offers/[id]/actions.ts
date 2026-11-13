"use server";

import { revalidatePath } from "next/cache";
import { AppError, createApplication } from "@/lib/applications";
import { getCurrentUser } from "@/lib/auth";
import { isDemo } from "@/lib/demo";
import { notifyApplicationCreated } from "@/lib/notifications";
import { PhotoError, savePhoto } from "@/lib/photos";

export type ApplyState = { ok?: boolean; error?: string };

export async function apply(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Войдите, чтобы подать заявку." };
  if (user.role !== "MODEL") return { error: "Заявки подают только модели. Войдите как модель." };

  const slotId = String(formData.get("slotId") ?? "");
  if (!slotId) return { error: "Выберите дату." };
  const ageConfirmed = formData.get("age") === "on";
  const comment = String(formData.get("comment") ?? "");

  let photoPath: string | null = null;
  const file = formData.get("photo");
  // В демо-режиме фото не принимаем и не храним.
  if (!isDemo() && file instanceof File && file.size > 0) {
    try {
      photoPath = await savePhoto(file);
    } catch (e) {
      if (e instanceof PhotoError) return { error: e.message };
      throw e;
    }
  }

  try {
    const created = await createApplication({ modelId: user.id, slotId, comment, photoPath, ageConfirmed, isDemo: isDemo() });
    await notifyApplicationCreated(created.id);
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    throw e;
  }
  revalidatePath("/cabinet");
  return { ok: true };
}
