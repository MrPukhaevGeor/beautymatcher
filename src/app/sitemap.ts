import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { visibleOfferWhere } from "@/lib/catalog";
import { isDemo } from "@/lib/demo";
import { SEO_PAGES } from "@/lib/seo-pages";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // В демо-режиме карта сайта пуста: индексировать нечего.
  if (isDemo()) return [];
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const [offers, providers] = await Promise.all([
    db.offer.findMany({ where: visibleOfferWhere(), select: { id: true } }),
    db.provider.findMany({ where: { status: "APPROVED" }, select: { slug: true } }),
  ]);
  return [
    ...["", "/offers", "/for-providers", "/about"].map((p) => ({ url: `${base}${p}` })),
    ...SEO_PAGES.map((p) => ({ url: `${base}/free/${p.slug}` })),
    ...offers.map((o) => ({ url: `${base}/offers/${o.id}` })),
    ...providers.map((p) => ({ url: `${base}/providers/${p.slug}` })),
  ];
}
