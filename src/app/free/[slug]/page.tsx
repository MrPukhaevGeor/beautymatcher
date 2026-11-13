import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listOffers } from "@/lib/catalog";
import { PROVIDER_TYPE_LABEL, formatSlot, priceLabel } from "@/lib/labels";
import { SEO_PAGES, seoPageBySlug } from "@/lib/seo-pages";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return SEO_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = seoPageBySlug((await params).slug);
  if (!page) return {};
  return { title: page.title, description: page.description, alternates: { canonical: `/free/${page.slug}` } };
}

export default async function FreeServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const page = seoPageBySlug((await params).slug);
  if (!page) notFound();
  const offers = await listOffers({ service: page.service });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">{page.h1}</h1>
        <p>{page.intro}</p>
      </header>

      <section aria-labelledby="now" className="space-y-3">
        <h2 id="now" className="text-xl font-bold">Сейчас доступно</h2>
        {offers.length === 0 ? (
          <div className="card space-y-2">
            <p>Подходящих предложений на ближайшие даты пока нет.</p>
            <Link href="/offers" className="btn btn-ghost no-underline">Смотреть весь каталог</Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {offers.map((o) => (
              <li key={o.id} className="card space-y-1">
                <Link href={`/offers/${o.id}`} className="font-bold no-underline">{o.title}</Link>
                <p className="text-sm text-muted">
                  {o.provider.title} · {PROVIDER_TYPE_LABEL[o.provider.type]} · {o.provider.district} округ
                </p>
                <p className="text-sm">
                  <span className={`chip ${o.priceMode === "FREE" ? "chip-ok" : "chip-warn"}`}>{priceLabel(o.priceMode, o.materialsFrom)}</span>
                  {o.slots[0] && <> Ближайшая дата: {formatSlot(o.slots[0].startsAt)}</>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="faq" className="space-y-3">
        <h2 id="faq" className="text-xl font-bold">Частые вопросы</h2>
        {page.faq.map((f) => (
          <details key={f.q} className="card">
            <summary className="cursor-pointer font-semibold">{f.q}</summary>
            <p className="mt-2 text-sm">{f.a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
