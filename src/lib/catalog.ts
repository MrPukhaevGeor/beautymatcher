import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { isProviderType, isServiceKey } from "@/lib/labels";
import { OCCUPYING } from "@/lib/statuses";

export type CatalogFilters = {
  service?: string;
  price?: string;
  district?: string;
  type?: string;
  date?: string; // YYYY-MM-DD
};

/** Предложения, видимые всем: одобренные, от одобренного исполнителя, с будущими датами. */
export function visibleOfferWhere(f: CatalogFilters = {}): Prisma.OfferWhereInput {
  const now = new Date();
  const slotWhere: Prisma.SlotWhereInput = { startsAt: { gt: now } };

  if (f.date && /^\d{4}-\d{2}-\d{2}$/.test(f.date)) {
    const start = new Date(`${f.date}T00:00:00+03:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    if (!Number.isNaN(start.getTime())) slotWhere.startsAt = { gt: now, gte: start, lt: end };
  }

  const providerWhere: Prisma.ProviderWhereInput = { status: "APPROVED" };
  if (f.district) providerWhere.district = f.district;
  if (f.type && isProviderType(f.type)) providerWhere.type = f.type;

  const where: Prisma.OfferWhereInput = {
    status: "APPROVED",
    provider: providerWhere,
    slots: { some: slotWhere },
  };
  if (f.service && isServiceKey(f.service)) where.service = f.service;
  if (f.price === "free") where.priceMode = "FREE";
  if (f.price === "materials") where.priceMode = "MATERIALS_ONLY";
  return where;
}

export async function listOffers(filters: CatalogFilters) {
  return db.offer.findMany({
    where: visibleOfferWhere(filters),
    include: {
      provider: { select: { title: true, slug: true, type: true, district: true, metro: true } },
      slots: { where: { startsAt: { gt: new Date() } }, orderBy: { startsAt: "asc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
}

/** Свободные места на каждую дату предложения. */
export async function slotsWithFreeSeats(offerId: string) {
  const slots = await db.slot.findMany({
    where: { offerId, startsAt: { gt: new Date() } },
    orderBy: { startsAt: "asc" },
    include: { applications: { where: { status: { in: OCCUPYING } }, select: { id: true } } },
  });
  return slots.map((s) => ({
    id: s.id,
    startsAt: s.startsAt,
    capacity: s.capacity,
    free: Math.max(0, s.capacity - s.applications.length),
  }));
}
