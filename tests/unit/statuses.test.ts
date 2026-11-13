import { describe, expect, it } from "vitest";
import { canTransition } from "@/lib/statuses";

describe("переходы статусов заявки", () => {
  it("исполнитель подтверждает и отклоняет, модель — нет", () => {
    expect(canTransition("PENDING", "CONFIRMED", "PROVIDER")).toBe(true);
    expect(canTransition("PENDING", "DECLINED", "PROVIDER")).toBe(true);
    expect(canTransition("PENDING", "CONFIRMED", "MODEL")).toBe(false);
    expect(canTransition("PENDING", "DECLINED", "MODEL")).toBe(false);
  });

  it("отменить может и модель, и исполнитель", () => {
    expect(canTransition("PENDING", "CANCELLED", "MODEL")).toBe(true);
    expect(canTransition("CONFIRMED", "CANCELLED", "MODEL")).toBe(true);
    expect(canTransition("CONFIRMED", "CANCELLED", "PROVIDER")).toBe(true);
  });

  it("«пришла» и «не пришла» отмечает только исполнитель и только по подтверждённой", () => {
    expect(canTransition("CONFIRMED", "ATTENDED", "PROVIDER")).toBe(true);
    expect(canTransition("CONFIRMED", "NO_SHOW", "PROVIDER")).toBe(true);
    expect(canTransition("CONFIRMED", "ATTENDED", "MODEL")).toBe(false);
    expect(canTransition("PENDING", "ATTENDED", "PROVIDER")).toBe(false);
  });

  it("из конечных статусов выхода нет", () => {
    for (const s of ["DECLINED", "CANCELLED", "ATTENDED", "NO_SHOW"] as const) {
      for (const to of ["PENDING", "CONFIRMED", "CANCELLED", "ATTENDED"] as const) {
        expect(canTransition(s, to, "PROVIDER")).toBe(false);
        expect(canTransition(s, to, "MODEL")).toBe(false);
      }
    }
  });
});
