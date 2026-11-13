import type { Metadata } from "next";
import Link from "next/link";
import { listOffers, type CatalogFilters } from "@/lib/catalog";
import { DISTRICTS, PROVIDER_TYPE_LABEL, SERVICE_LABEL, formatSlot, priceLabel } from "@/lib/labels";

export const metadata: Metadata = { title: "Каталог предложений" };
export const dynamic = "force-dynamic";

type Params = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v || undefined;
}

export default async function OffersPage({ searchParams }: { searchParams: Params }) {
  const sp = await searchParams;
  const filters: CatalogFilters = {
    service: first(sp.service), price: first(sp.price), district: first(sp.district),
    type: first(sp.type), date: first(sp.date),
  };
  const offers = await listOffers(filters);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Каталог предложений</h1>

      <form method="get" className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Фильтры">
        <Select name="service" label="Услуга" value={filters.service} options={Object.entries(SERVICE_LABEL)} />
        <Select name="price" label="Стоимость" value={filters.price}
          options={[["free", "Полностью бесплатно"], ["materials", "Только материалы"]]} />
        <Select name="district" label="Округ" value={filters.district} options={DISTRICTS.map((d) => [d, d])} />
        <Select name="type" label="Кто принимает" value={filters.type} options={Object.entries(PROVIDER_TYPE_LABEL)} />
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="date">Дата</label>
          <input id="date" name="date" type="date" defaultValue={filters.date} className="field" />
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
          <button className="btn">Показать</button>
          <Link href="/offers" className="btn btn-ghost no-underline">Сбросить</Link>
        </div>
      </form>

      <p className="text-sm text-muted" aria-live="polite">Найдено предложений: {offers.length}</p>

      {offers.length === 0 ? (
        <div className="card">
          <p className="font-semibold">По этим условиям ничего не нашлось.</p>
          <p className="text-sm text-muted">Попробуйте убрать часть фильтров или выбрать другую дату.</p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {offers.map((o) => (
            <li key={o.id} className="card space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip">{SERVICE_LABEL[o.service]}</span>
                <span className={`chip ${o.priceMode === "FREE" ? "chip-ok" : "chip-warn"}`}>
                  {priceLabel(o.priceMode, o.materialsFrom)}
                </span>
              </div>
              <h2 className="text-lg font-bold">
                <Link href={`/offers/${o.id}`} className="no-underline">{o.title}</Link>
              </h2>
              <p className="text-sm text-muted">
                <Link href={`/providers/${o.provider.slug}`}>{o.provider.title}</Link>
                {" · "}{PROVIDER_TYPE_LABEL[o.provider.type]}
                {" · "}{o.provider.district} округ{o.provider.metro ? `, м. ${o.provider.metro}` : ""}
              </p>
              {o.slots[0] && <p className="text-sm">Ближайшая дата: <b>{formatSlot(o.slots[0].startsAt)}</b></p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Select({ name, label, value, options }: {
  name: string; label: string; value?: string; options: readonly (readonly [string, string])[] | [string, string][];
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold" htmlFor={name}>{label}</label>
      <select id={name} name={name} defaultValue={value ?? ""} className="field">
        <option value="">Любая</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
