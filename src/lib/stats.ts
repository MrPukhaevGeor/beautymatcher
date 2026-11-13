import { db } from "@/lib/db";
import { isDemo } from "@/lib/demo";

export type StatRow = {
  status: string;
  service: string;
  district: string;
  providerType: string;
  createdAt: Date;
};

export type Stats = {
  total: number;
  byStatus: Record<string, number>;
  byService: Record<string, number>;
  byDistrict: Record<string, number>;
  byProviderType: Record<string, number>;
  byWeek: Record<string, number>;
  /** Доля пришедших среди тех, по кому проставлено «пришла» или «не пришла». null, если отмеченных нет. */
  attendanceRate: number | null;
};

/** Начало недели (понедельник) в UTC, формат YYYY-MM-DD. */
export function weekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const shift = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - shift);
  return t.toISOString().slice(0, 10);
}

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

export function buildStats(rows: StatRow[]): Stats {
  const s: Stats = { total: rows.length, byStatus: {}, byService: {}, byDistrict: {}, byProviderType: {}, byWeek: {}, attendanceRate: null };
  for (const r of rows) {
    bump(s.byStatus, r.status);
    bump(s.byService, r.service);
    bump(s.byDistrict, r.district);
    bump(s.byProviderType, r.providerType);
    bump(s.byWeek, weekKey(r.createdAt));
  }
  const attended = s.byStatus.ATTENDED ?? 0;
  const noShow = s.byStatus.NO_SHOW ?? 0;
  if (attended + noShow > 0) s.attendanceRate = attended / (attended + noShow);
  return s;
}

export async function loadPilotStats() {
  const demo = isDemo();
  const [apps, providers, offers] = await Promise.all([
    db.application.findMany({
      where: { isDemo: demo },
      select: {
        status: true, createdAt: true,
        slot: { select: { offer: { select: { service: true, provider: { select: { district: true, type: true } } } } } },
      },
    }),
    db.provider.groupBy({ by: ["type"], where: { isDemo: demo, status: "APPROVED" }, _count: { _all: true } }),
    db.offer.count({ where: { isDemo: demo, status: "APPROVED" } }),
  ]);

  const stats = buildStats(
    apps.map((a) => ({
      status: a.status, createdAt: a.createdAt, service: a.slot.offer.service,
      district: a.slot.offer.provider.district, providerType: a.slot.offer.provider.type,
    })),
  );
  return {
    demo,
    stats,
    providersByType: Object.fromEntries(providers.map((p) => [p.type, p._count._all])),
    offers,
  };
}
