import { getCurrentUser } from "@/lib/auth";
import { PROVIDER_TYPE_LABEL, SERVICE_LABEL } from "@/lib/labels";
import { loadPilotStats } from "@/lib/stats";
import { STATUS_LABEL } from "@/lib/statuses";

function cell(v: string | number): string {
  const s = String(v);
  // Защита от формул в Excel: значение, начинающееся со спецсимвола, экранируем.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return new Response("Нет доступа", { status: 403 });

  const { stats, demo, offers, providersByType } = await loadPilotStats();
  const rows: [string, string, string | number][] = [
    ["Режим", "", demo ? "ДЕМО (цифры вымышленные)" : "Реальные данные"],
    ["Итого", "Заявок", stats.total],
    ["Итого", "Предложений", offers],
    ["Итого", "Доля пришедших", stats.attendanceRate === null ? "нет данных" : `${Math.round(stats.attendanceRate * 100)}%`],
    ...Object.entries(stats.byStatus).map(([k, v]): [string, string, number] => ["Статус заявки", STATUS_LABEL[k as keyof typeof STATUS_LABEL] ?? k, v]),
    ...Object.entries(stats.byService).map(([k, v]): [string, string, number] => ["Услуга", SERVICE_LABEL[k as keyof typeof SERVICE_LABEL] ?? k, v]),
    ...Object.entries(stats.byDistrict).map(([k, v]): [string, string, number] => ["Округ", k, v]),
    ...Object.entries(providersByType).map(([k, v]): [string, string, number] => ["Тип исполнителя", PROVIDER_TYPE_LABEL[k as keyof typeof PROVIDER_TYPE_LABEL] ?? k, v]),
    ...Object.entries(stats.byWeek).sort().map(([k, v]): [string, string, number] => ["Неделя", k, v]),
  ];
  const body = "﻿" + ["Раздел,Показатель,Значение", ...rows.map((r) => r.map(cell).join(","))].join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pilot-stats${demo ? "-demo" : ""}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
