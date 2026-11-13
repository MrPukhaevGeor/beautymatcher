import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { slotsWithFreeSeats } from "@/lib/catalog";
import { isDemo } from "@/lib/demo";
import { PROVIDER_TYPE_LABEL, SERVICE_LABEL, priceLabel } from "@/lib/labels";
import { canSeeProviderContacts } from "@/lib/visibility";
import { ApplyForm } from "./apply-form";

export const dynamic = "force-dynamic";

async function getOffer(id: string) {
  return db.offer.findFirst({
    where: { id, status: "APPROVED", provider: { status: "APPROVED" } },
    include: { provider: true },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const offer = await getOffer((await params).id);
  return { title: offer?.title ?? "Предложение" };
}

export default async function OfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const offer = await getOffer(id);
  if (!offer) notFound();

  const user = await getCurrentUser();
  const slots = await slotsWithFreeSeats(offer.id);
  const showContacts = await canSeeProviderContacts(offer.provider, user);
  const p = offer.provider;

  return (
    <article className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">{SERVICE_LABEL[offer.service]}</span>
          <span className={`chip ${offer.priceMode === "FREE" ? "chip-ok" : "chip-warn"}`}>
            {priceLabel(offer.priceMode, offer.materialsFrom)}
          </span>
        </div>
        <h1 className="text-2xl font-bold">{offer.title}</h1>
        {offer.priceMode === "MATERIALS_ONLY" && (
          <p className="text-sm text-muted">
            Саму услугу выполняют бесплатно, но материалы (например, краску) оплачиваете вы. Итоговую сумму уточняют при подтверждении.
          </p>
        )}
      </header>

      {offer.description && <p>{offer.description}</p>}

      <section className="card space-y-1" aria-labelledby="who">
        <h2 id="who" className="font-bold">Кто принимает</h2>
        <p>
          <Link href={`/providers/${p.slug}`}>{p.title}</Link>{" "}
          <span className="chip">{PROVIDER_TYPE_LABEL[p.type]}</span>
        </p>
        <p className="text-sm text-muted">{p.district} округ{p.metro ? `, м. ${p.metro}` : ""}</p>
        {showContacts ? (
          <p className="text-sm">Адрес: {p.address}<br />Контакт: {p.contact}</p>
        ) : (
          <p className="text-sm text-muted">Точный адрес и контакты откроются после подтверждения вашей заявки.</p>
        )}
      </section>

      <section className="card space-y-3" aria-labelledby="apply">
        <h2 id="apply" className="font-bold">Записаться моделью</h2>
        {slots.length === 0 ? (
          <p className="text-muted">Свободных дат сейчас нет.</p>
        ) : (
          <ApplyForm
            slots={slots.map((s) => ({ id: s.id, startsAt: s.startsAt.toISOString(), free: s.free }))}
            demo={isDemo()}
            role={user?.role ?? null}
          />
        )}
      </section>
    </article>
  );
}
