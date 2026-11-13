import { db } from "@/lib/db";
import { sendEmail } from "@/lib/notify";
import { formatSlot } from "@/lib/labels";
import { STATUS_LABEL, type Status } from "@/lib/statuses";

// Уведомления только на почту. Ошибка отправки не должна ломать действие пользователя.

const siteUrl = () => process.env.SITE_URL ?? "http://localhost:3000";

async function load(applicationId: string) {
  return db.application.findUnique({
    where: { id: applicationId },
    include: {
      model: { select: { email: true } },
      slot: { include: { offer: { include: { provider: { include: { user: { select: { email: true } } } } } } } },
    },
  });
}

export async function notifyApplicationCreated(applicationId: string) {
  try {
    const app = await load(applicationId);
    const to = app?.slot.offer.provider.user.email;
    if (!app || !to) return;
    await sendEmail(
      to,
      "Новая заявка модели",
      `Новая заявка на «${app.slot.offer.title}», ${formatSlot(app.slot.startsAt)}.\nОткройте кабинет, чтобы подтвердить или отклонить: ${siteUrl()}/provider`,
    );
  } catch (e) {
    console.error("[notify] не удалось отправить письмо исполнителю", e);
  }
}

export async function notifyStatusChanged(applicationId: string) {
  try {
    const app = await load(applicationId);
    const to = app?.model.email;
    if (!app || !to) return;
    await sendEmail(
      to,
      `Заявка: ${STATUS_LABEL[app.status as Status].toLowerCase()}`,
      `Заявка на «${app.slot.offer.title}», ${formatSlot(app.slot.startsAt)}: ${STATUS_LABEL[app.status as Status].toLowerCase()}.\nПодробности в кабинете: ${siteUrl()}/cabinet`,
    );
  } catch (e) {
    console.error("[notify] не удалось отправить письмо модели", e);
  }
}
