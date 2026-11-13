import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { readSessionUserId } from "@/lib/session";

export type Role = "MODEL" | "PROVIDER" | "ADMIN";

export async function getCurrentUser() {
  const id = await readSessionUserId();
  if (!id) return null;
  const user = await db.user.findUnique({ where: { id }, include: { provider: true } });
  if (!user || user.blocked) return null;
  return user;
}

export async function requireUser(role?: Role) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (role && user.role !== role) redirect(homeFor(user.role));
  return user;
}

export function homeFor(role: Role): string {
  return role === "ADMIN" ? "/admin" : role === "PROVIDER" ? "/provider" : "/cabinet";
}
