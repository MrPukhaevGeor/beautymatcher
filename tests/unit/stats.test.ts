import { describe, expect, it } from "vitest";
import { buildStats, weekKey } from "@/lib/stats";

const row = (over: Partial<Parameters<typeof buildStats>[0][number]> = {}) => ({
  status: "PENDING", service: "HAIRCUT", district: "Центральный", providerType: "SCHOOL",
  createdAt: new Date("2026-11-04T10:00:00Z"), ...over,
});

describe("статистика пилота", () => {
  it("пустой набор даёт нули и отсутствие доли пришедших", () => {
    const s = buildStats([]);
    expect(s.total).toBe(0);
    expect(s.attendanceRate).toBeNull();
  });

  it("считает заявки по статусам, услугам, округам и типам", () => {
    const s = buildStats([
      row(), row({ status: "CONFIRMED", service: "COLORING" }),
      row({ status: "CONFIRMED", district: "Южный", providerType: "COLLEGE" }),
    ]);
    expect(s.total).toBe(3);
    expect(s.byStatus).toEqual({ PENDING: 1, CONFIRMED: 2 });
    expect(s.byService).toEqual({ HAIRCUT: 2, COLORING: 1 });
    expect(s.byDistrict).toEqual({ Центральный: 2, Южный: 1 });
    expect(s.byProviderType).toEqual({ SCHOOL: 2, COLLEGE: 1 });
  });

  it("доля пришедших считается только по отмеченным заявкам", () => {
    const s = buildStats([
      row({ status: "ATTENDED" }), row({ status: "ATTENDED" }), row({ status: "ATTENDED" }),
      row({ status: "NO_SHOW" }), row({ status: "PENDING" }), row({ status: "CANCELLED" }),
    ]);
    expect(s.attendanceRate).toBe(0.75);
  });

  it("недели начинаются с понедельника", () => {
    // 4 ноября 2026 — среда, неделя начинается 2 ноября. Воскресенье 8 ноября — та же неделя.
    expect(weekKey(new Date("2026-11-04T10:00:00Z"))).toBe("2026-11-02");
    expect(weekKey(new Date("2026-11-08T23:00:00Z"))).toBe("2026-11-02");
    expect(weekKey(new Date("2026-11-09T00:00:00Z"))).toBe("2026-11-09");
  });
});
