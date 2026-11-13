import { db } from "@/lib/db";

type Viewer = { id: string; role: string } | null;

/**
 * Адрес и контакты школы, колледжа, академии и салона открыты всем.
 * У частного мастера они открываются только после подтверждения заявки
 * (самому мастеру и администратору — всегда).
 */
export async function canSeeProviderContacts(
  provider: { id: string; type: string; userId: string },
  viewer: Viewer,
): Promise<boolean> {
  if (provider.type !== "PRIVATE_MASTER") return true;
  if (!viewer) return false;
  if (viewer.role === "ADMIN" || viewer.id === provider.userId) return true;

  const confirmed = await db.application.count({
    where: {
      modelId: viewer.id,
      status: { in: ["CONFIRMED", "ATTENDED"] },
      slot: { offer: { providerId: provider.id } },
    },
  });
  return confirmed > 0;
}
