import { describe, expect, it } from "vitest";
import { formatDateRange } from "./exhibitionFormat";

describe("exhibition date range", () => {
  it("writes the year once when both dates share it", () => {
    expect(
      formatDateRange({ startDate: "2026-03-12", endDate: "2026-04-30" }),
    ).toBe("12 de marzo – 30 de abril de 2026");
  });

  it("writes both years when they differ", () => {
    expect(
      formatDateRange({ startDate: "2025-12-01", endDate: "2026-01-15" }),
    ).toBe("1 de diciembre de 2025 – 15 de enero de 2026");
  });

  it("handles single days and open ranges", () => {
    expect(
      formatDateRange({ startDate: "2026-03-12", endDate: "2026-03-12" }),
    ).toBe("12 de marzo de 2026");
    expect(formatDateRange({ startDate: "2026-03-12", endDate: null })).toBe(
      "Desde el 12 de marzo de 2026",
    );
    expect(formatDateRange({ startDate: null, endDate: "2026-03-12" })).toBe(
      "Hasta el 12 de marzo de 2026",
    );
    expect(formatDateRange({ startDate: null, endDate: null })).toBeNull();
  });
});
