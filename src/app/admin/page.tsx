import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PROVIDER_TYPE_LABEL, SERVICE_LABEL, formatSlot, priceLabel } from "@/lib/labels";
import { loadPilotStats } from "@/lib/stats";
import { STATUS_LABEL } from "@/lib/statuses";
import { moderateOffer, moderateProvider, setBlocked, setReviewHidden } from "./actions";

export const metadata: Metadata = { title: "Админка" };
export const dynamic = "force-dynamic";

function Pair({ action, id, to, label, ghost }: { action: (f: FormData) => Promise<void>; id: string; to: string; label: string; ghost?: boolean }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="to" value={to} />
      <button className={`btn !min-h-9 text-sm ${ghost ? "btn-ghost" : ""}`}>{label}</button>
    </form>
  );
}

function Table({ title, data, labels }: { title: string; data: Record<string, number>; labels?: Record<string, string> }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <div className="card">
      <h3 className="mb-2 font-bold">{title}</h3>
      {rows.length === 0 ? <p className="text-sm text-muted">Нет данных</p> : (
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-t border-line first:border-0">
                <th scope="row" className="py-1 text-left font-normal">{labels?.[k] ?? k}</th>
                <td className="py-1 text-right font-semibold">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default async function AdminPage() {
  await requireUser("ADMIN");

  const [providers, offers, users, reviews, pilot] = await Promise.all([
    db.provider.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" } }),
    db.offer.findMany({
      where: { status: "PENDING" }, orderBy: { createdAt: "asc" },
      include: { provider: { select: { title: true } }, slots: { orderBy: { startsAt: "asc" } } },
    }),
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    db.review.findMany({
      orderBy: { createdAt: "desc" }, take: 30,
      include: { author: { select: { name: true } } },
    }),
    loadPilotStats(),
  ]);
  const { stats } = pilot;
  const statusLabels = Object.fromEntries(Object.entries(STATUS_LABEL)) as Record<string, string>;

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold">Админка</h1>

      <section aria-labelledby="queue" className="space-y-3">
        <h2 id="queue" className="text-xl font-bold">Очередь проверки</h2>
        {providers.length === 0 && offers.length === 0 && <p className="text-muted">Очередь пуста.</p>}
        <ul className="space-y-3">
          {providers.map((p) => (
            <li key={p.id} className="card space-y-2">
              <p><span className="chip">{PROVIDER_TYPE_LABEL[p.type]}</span> <b>{p.title}</b></p>
              <p className="text-sm text-muted">{p.district} округ · {p.address} · {p.contact}</p>
              {p.description && <p className="text-sm">{p.description}</p>}
              <div className="flex gap-2">
                <Pair action={moderateProvider} id={p.id} to="APPROVED" label="Одобрить" />
                <Pair action={moderateProvider} id={p.id} to="REJECTED" label="Отклонить" ghost />
              </div>
            </li>
          ))}
          {offers.map((o) => (
            <li key={o.id} className="card space-y-2">
              <p><span className="chip">{SERVICE_LABEL[o.service]}</span> <b>{o.title}</b></p>
              <p className="text-sm text-muted">{o.provider.title} · {priceLabel(o.priceMode, o.materialsFrom)}</p>
              {o.description && <p className="text-sm">{o.description}</p>}
              <p className="text-sm">Даты: {o.slots.map((s) => `${formatSlot(s.startsAt)} (мест ${s.capacity})`).join("; ")}</p>
              <div className="flex gap-2">
                <Pair action={moderateOffer} id={o.id} to="APPROVED" label="Одобрить" />
                <Pair action={moderateOffer} id={o.id} to="REJECTED" label="Отклонить" ghost />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="stats" className="space-y-3">
        <h2 id="stats" className="text-xl font-bold">Статистика пилота</h2>
        {pilot.demo && (
          <p role="note" className="rounded-xl bg-warn-soft p-3 font-semibold text-warn">
            Демонстрационные цифры. Использовать их в разговоре с городом нельзя.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card"><p className="text-sm text-muted">Заявок</p><p className="text-2xl font-bold">{stats.total}</p></div>
          <div className="card"><p className="text-sm text-muted">Предложений</p><p className="text-2xl font-bold">{pilot.offers}</p></div>
          <div className="card"><p className="text-sm text-muted">Исполнителей</p><p className="text-2xl font-bold">{Object.values(pilot.providersByType).reduce((a, b) => a + b, 0)}</p></div>
          <div className="card">
            <p className="text-sm text-muted">Пришли</p>
            <p className="text-2xl font-bold">{stats.attendanceRate === null ? "нет данных" : `${Math.round(stats.attendanceRate * 100)}%`}</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Table title="Заявки по статусам" data={stats.byStatus} labels={statusLabels} />
          <Table title="Заявки по услугам" data={stats.byService} labels={SERVICE_LABEL} />
          <Table title="Заявки по округам" data={stats.byDistrict} />
          <Table title="Исполнители по типам" data={pilot.providersByType} labels={PROVIDER_TYPE_LABEL} />
          <Table title="Заявки по неделям (начало недели)" data={stats.byWeek} />
        </div>
        <p><a className="btn btn-ghost no-underline" href="/admin/stats.csv">Скачать CSV</a></p>
      </section>

      <section aria-labelledby="reviews" className="space-y-3">
        <h2 id="reviews" className="text-xl font-bold">Отзывы</h2>
        {reviews.length === 0 ? <p className="text-muted">Отзывов нет.</p> : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="card flex flex-wrap items-center justify-between gap-2">
                <p className={r.hidden ? "opacity-60" : ""}>{r.author.name}: {"★".repeat(r.rating)} {r.text}</p>
                <form action={setReviewHidden}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="hidden" value={String(!r.hidden)} />
                  <button className="btn btn-ghost !min-h-9 text-sm">{r.hidden ? "Показать" : "Скрыть"}</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="users" className="space-y-3">
        <h2 id="users" className="text-xl font-bold">Пользователи</h2>
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id} className="card flex flex-wrap items-center justify-between gap-2">
              <p>
                <b>{u.name}</b> <span className="chip">{u.role}</span>{" "}
                {u.blocked && <span className="chip chip-bad">Заблокирован</span>}
                <span className="block text-sm text-muted">{u.email ?? u.phone ?? "—"}</span>
              </p>
              {u.role !== "ADMIN" && (
                <form action={setBlocked}>
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="blocked" value={String(!u.blocked)} />
                  <button className="btn btn-ghost !min-h-9 text-sm">{u.blocked ? "Разблокировать" : "Заблокировать"}</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
