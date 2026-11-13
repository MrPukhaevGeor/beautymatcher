import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatSlot } from "@/lib/labels";
import { STATUS_LABEL, type Status } from "@/lib/statuses";
import { cancelApplication, leaveReview } from "./actions";

export const metadata: Metadata = { title: "Мои заявки" };
export const dynamic = "force-dynamic";

const CHIP: Record<Status, string> = {
  PENDING: "chip-warn", CONFIRMED: "chip-ok", DECLINED: "chip-bad",
  CANCELLED: "", ATTENDED: "chip-ok", NO_SHOW: "chip-bad",
};

export default async function CabinetPage() {
  const user = await requireUser("MODEL");
  const apps = await db.application.findMany({
    where: { modelId: user.id },
    orderBy: { slot: { startsAt: "desc" } },
    include: { review: true, slot: { include: { offer: { include: { provider: true } } } } },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Мои заявки</h1>
      {apps.length === 0 ? (
        <div className="card space-y-2">
          <p>Заявок пока нет.</p>
          <Link href="/offers" className="btn no-underline">Найти предложение</Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {apps.map((a) => {
            const st = a.status as Status;
            const p = a.slot.offer.provider;
            const contactsOpen = st === "CONFIRMED" || st === "ATTENDED" || p.type !== "PRIVATE_MASTER";
            return (
              <li key={a.id} className="card space-y-2">
                <p className="flex flex-wrap items-center gap-2">
                  <span className={`chip ${CHIP[st]}`}>{STATUS_LABEL[st]}</span>
                  <b>{formatSlot(a.slot.startsAt)}</b>
                </p>
                <p>
                  <Link href={`/offers/${a.slot.offer.id}`}>{a.slot.offer.title}</Link>
                  {" · "}<Link href={`/providers/${p.slug}`}>{p.title}</Link>
                </p>
                {st === "CONFIRMED" && contactsOpen && (
                  <p className="rounded-xl bg-ok-soft p-3 text-sm">Адрес: {p.address}<br />Контакт: {p.contact}</p>
                )}
                {(st === "PENDING" || st === "CONFIRMED") && (
                  <form action={cancelApplication}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="btn btn-ghost !min-h-9 text-sm">Отменить заявку</button>
                  </form>
                )}
                {st === "ATTENDED" && (a.review ? (
                  <p className="text-sm text-muted">Ваш отзыв: {"★".repeat(a.review.rating)} {a.review.text}</p>
                ) : (
                  <form action={leaveReview} className="space-y-2 rounded-xl border border-line p-3">
                    <input type="hidden" name="id" value={a.id} />
                    <label htmlFor={`r-${a.id}`} className="block text-sm font-semibold">Оценка</label>
                    <select id={`r-${a.id}`} name="rating" className="field" defaultValue="5">
                      {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} из 5</option>)}
                    </select>
                    <label htmlFor={`t-${a.id}`} className="block text-sm font-semibold">Отзыв</label>
                    <textarea id={`t-${a.id}`} name="text" rows={2} maxLength={1000} className="field" />
                    <button className="btn !min-h-9 text-sm">Оставить отзыв</button>
                  </form>
                ))}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
