import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { readPhoto } from "@/lib/photos";

// Фото заявки видит только получатель (владелец предложения), автор заявки и администратор.
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Нет доступа", { status: 401 });

  const app = await db.application.findFirst({
    where: { photoPath: name },
    include: { slot: { include: { offer: { include: { provider: { select: { userId: true } } } } } } },
  });
  const allowed =
    app && (user.role === "ADMIN" || app.modelId === user.id || app.slot.offer.provider.userId === user.id);
  if (!allowed) return new Response("Не найдено", { status: 404 });

  const data = await readPhoto(name);
  if (!data) return new Response("Не найдено", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store" },
  });
}
