import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PROVIDER_TYPE_LABEL, SERVICE_LABEL, formatSlot, priceLabel } from "@/lib/labels";
import { canSeeProviderContacts } from "@/lib/visibility";

export const dynamic = "force-dynamic";

async function getProvider(slug: string) {
  return db.provider.findFirst({ where: { slug, status: "APPROVED" } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProvider((await params).slug);
  return { title: p?.title ?? "Исполнитель" };
}

export default async function ProviderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const provider = await getProvider(slug);
  if (!provider) notFound();

  const user = await getCurrentUser();
  const showContacts = await canSeeProviderContacts(provider, user);

  const [offers, reviews] = await Promise.all([
    db.offer.findMany({
      where: { providerId: provider.id, status: "APPROVED" },
      include: { slots: { where: { startsAt: { gt: new Date() } }, orderBy: { startsAt: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    }),
    db.review.findMany({
      where: { hidden: false, application: { slot: { offer: { providerId: provider.id } } } },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <span className="chip">{PROVIDER_TYPE_LABEL[provider.type]}</span>
        <h1 className="text-2xl font-bold">{provider.title}</h1>
        <p className="text-sm text-muted">
          {provider.district} округ{provider.metro ? `, м. ${provider.metro}` : ""}
          {avg !== null && <> · Оценка {avg.toFixed(1)} из 5 ({reviews.length})</>}
        </p>
      </header>

      {provider.description && <p>{provider.description}</p>}

      <section className="card text-sm" aria-labelledby="contacts">
        <h2 id="contacts" className="mb-1 font-bold">Адрес и контакты</h2>
        {showContacts ? (
          <p>{provider.address}<br />{provider.contact}</p>
        ) : (
          <p className="text-muted">Откроются после подтверждения вашей заявки.</p>
        )}
      </section>

      <section aria-labelledby="offers" className="space-y-3">
        <h2 id="offers" className="text-xl font-bold">Предложения</h2>
        {offers.length === 0 ? <p className="text-muted">Сейчас предложений нет.</p> : (
          <ul className="space-y-3">
            {offers.map((o) => (
              <li key={o.id} className="card space-y-1">
                <p className="flex flex-wrap gap-2">
                  <span className="chip">{SERVICE_LABEL[o.service]}</span>
                  <span className={`chip ${o.priceMode === "FREE" ? "chip-ok" : "chip-warn"}`}>{priceLabel(o.priceMode, o.materialsFrom)}</span>
                </p>
                <Link href={`/offers/${o.id}`} className="font-bold no-underline">{o.title}</Link>
                {o.slots[0] && <p className="text-sm text-muted">Ближайшая дата: {formatSlot(o.slots[0].startsAt)}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="reviews" className="space-y-3">
        <h2 id="reviews" className="text-xl font-bold">Отзывы</h2>
        {reviews.length === 0 ? <p className="text-muted">Отзывов пока нет.</p> : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="card">
                <p className="font-semibold">{r.author.name} · {"★".repeat(r.rating)}<span className="sr-only"> {r.rating} из 5</span></p>
                {r.text && <p className="text-sm">{r.text}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
