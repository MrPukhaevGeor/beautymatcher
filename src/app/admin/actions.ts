"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const MOD = ["APPROVED", "REJECTED", "PENDING"] as const;
type Mod = (typeof MOD)[number];

function modValue(formData: FormData): Mod | null {
  const v = String(formData.get("to"));
  return (MOD as readonly string[]).includes(v) ? (v as Mod) : null;
}

export async function moderateProvider(formData: FormData) {
  await requireUser("ADMIN");
  const to = modValue(formData);
  if (!to) return;
  await db.provider.update({ where: { id: String(formData.get("id")) }, data: { status: to } });
  revalidatePath("/admin");
}

export async function moderateOffer(formData: FormData) {
  await requireUser("ADMIN");
  const to = modValue(formData);
  if (!to) return;
  await db.offer.update({ where: { id: String(formData.get("id")) }, data: { status: to } });
  revalidatePath("/admin");
}

export async function setBlocked(formData: FormData) {
  const admin = await requireUser("ADMIN");
  const id = String(formData.get("id"));
  if (id === admin.id) return; // себя заблокировать нельзя
  await db.user.update({ where: { id }, data: { blocked: formData.get("blocked") === "true" } });
  revalidatePath("/admin");
}

export async function setReviewHidden(formData: FormData) {
  await requireUser("ADMIN");
  await db.review.update({ where: { id: String(formData.get("id")) }, data: { hidden: formData.get("hidden") === "true" } });
  revalidatePath("/admin");
}
