import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isDemo } from "@/lib/demo";
import { SERVICE_LABEL, formatSlot, priceLabel } from "@/lib/labels";
import { STATUS_LABEL, type Status } from "@/lib/statuses";
import { OfferForm, RegisterForm } from "./forms";
import { setApplicationStatus } from "./actions";

export const metadata: Metadata = { title: "Кабинет исполнителя" };
export const dynamic = "force-dynamic";

const MOD_LABEL = { PENDING: "На проверке", APPROVED: "Опубликовано", REJECTED: "Отклонено" } as const;
const MOD_CHIP = { PENDING: "chip-warn", APPROVED: "chip-ok", REJECTED: "chip-bad" } as const;

function StatusButton({ id, to, label, ghost }: { id: string; to: Status; label: string; ghost?: boolean }) {
  return (
    <form action={setApplicationStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="to" value={to} />
      <button className={`btn !min-h-9 text-sm ${ghost ? "btn-ghost" : ""}`}>{label}</button>
    </form>
  );
}

export default async function ProviderPage() {
  const user = await requireUser();
  if (user.role === "ADMIN") return <p>Администратору кабинет исполнителя не нужен. <Link href="/admin">В админку</Link></p>;

  const provider = user.provider;
  if (!provider) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-bold">Стать исполнителем</h1>
        <p className="text-muted">Расскажите о школе, колледже, салоне или о себе. Профиль появится в каталоге после проверки.</p>
        <RegisterForm demo={isDemo()} />
      </div>
    );
  }

  const [offers, apps] = await Promise.all([
    db.offer.findMany({ where: { providerId: provider.id }, orderBy: { createdAt: "desc" }, include: { slots: true } }),
    db.application.findMany({
      where: { slot: { offer: { providerId: provider.id } } },
      include: { model: { select: { name: true } }, slot: { include: { offer: { select: { title: true } } } } },
      orderBy: [{ status: "asc" }, { slot: { startsAt: "asc" } }],
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{provider.title}</h1>
        <p><span className={`chip ${MOD_CHIP[provider.status]}`}>{MOD_LABEL[provider.status]}</span></p>
        {provider.status !== "APPROVED" && (
          <p className="text-sm text-muted">Пока профиль не проверен, предложения создавать нельзя и в каталоге вас не видно.</p>
        )}
      </header>

      <section aria-labelledby="apps" className="space-y-3">
        <h2 id="apps" className="text-xl font-bold">Заявки</h2>
        {apps.length === 0 ? <p className="text-muted">Заявок пока нет.</p> : (
          <ul className="space-y-3">
            {apps.map((a) => {
              const st = a.status as Status;
              return (
                <li key={a.id} className="card space-y-2">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="chip">{STATUS_LABEL[st]}</span>
                    <b>{a.model.name}</b>
                    <span className="text-sm text-muted">{a.slot.offer.title}, {formatSlot(a.slot.startsAt)}</span>
                  </p>
                  {a.comment && <p className="text-sm">«{a.comment}»</p>}
                  {a.photoPath && (
                    <p className="text-sm"><a href={`/api/photos/${a.photoPath}`} target="_blank" rel="noreferrer">Фото волос</a></p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {st === "PENDING" && (<><StatusButton id={a.id} to="CONFIRMED" label="Подтвердить" /><StatusButton id={a.id} to="DECLINED" label="Отклонить" ghost /></>)}
                    {st === "CONFIRMED" && (<><StatusButton id={a.id} to="ATTENDED" label="Пришла" /><StatusButton id={a.id} to="NO_SHOW" label="Не пришла" ghost /><StatusButton id={a.id} to="CANCELLED" label="Отменить" ghost /></>)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="offers" className="space-y-3">
        <h2 id="offers" className="text-xl font-bold">Мои предложения</h2>
        {offers.length === 0 ? <p className="text-muted">Предложений пока нет.</p> : (
          <ul className="space-y-3">
            {offers.map((o) => (
              <li key={o.id} className="card space-y-1">
                <p className="flex flex-wrap gap-2">
                  <span className={`chip ${MOD_CHIP[o.status]}`}>{MOD_LABEL[o.status]}</span>
                  <span className="chip">{SERVICE_LABEL[o.service]}</span>
                  <span className="chip">{priceLabel(o.priceMode, o.materialsFrom)}</span>
                </p>
                <p className="font-bold">{o.title}</p>
                <p className="text-sm text-muted">Дат: {o.slots.length}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {provider.status === "APPROVED" && (
        <section aria-labelledby="new" className="space-y-3">
          <h2 id="new" className="text-xl font-bold">Новое предложение</h2>
          <OfferForm />
        </section>
      )}
    </div>
  );
}
