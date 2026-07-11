import { describe, expect, it } from "vitest";
import {
  formatDateRu,
  formatDurationRu,
  monthYearGenitive,
  monthYearNominative,
} from "./ru-format";

describe("ru-format", () => {
  it("формат длительности в днях и часах", () => {
    expect(formatDurationRu(5 * 24 * 3_600_000 + 3 * 3_600_000)).toBe(
      "5 дн. 3 ч.",
    );
    expect(formatDurationRu(2 * 24 * 3_600_000)).toBe("2 дн.");
    expect(formatDurationRu(3 * 3_600_000)).toBe("3 ч.");
    // Меньше часа округляется вверх до 1 ч.
    expect(formatDurationRu(10 * 60_000)).toBe("1 ч.");
  });

  it("месяц и год в родительном падеже", () => {
    expect(monthYearGenitive(7, 2026)).toBe("за июля 2026 года");
    expect(monthYearGenitive(1, 2025)).toBe("за января 2025 года");
  });

  it("месяц и год в именительном падеже", () => {
    expect(monthYearNominative(7, 2026)).toBe("Июль 2026");
    expect(monthYearNominative(12, 2026)).toBe("Декабрь 2026");
  });

  it("дата в формате дд.мм.гггг", () => {
    expect(formatDateRu(new Date(2026, 6, 7))).toBe("07.07.2026");
    expect(formatDateRu(new Date(2026, 11, 31))).toBe("31.12.2026");
  });
});

describe("ru-format — турецкая локаль", () => {
  it("длительность на турецком (gün / sa.)", () => {
    expect(formatDurationRu(5 * 24 * 3_600_000 + 3 * 3_600_000, "tr")).toBe(
      "5 gün 3 sa.",
    );
    expect(formatDurationRu(2 * 24 * 3_600_000, "tr")).toBe("2 gün");
    expect(formatDurationRu(3 * 3_600_000, "tr")).toBe("3 sa.");
  });

  it("месяц и год на турецком (без склонения)", () => {
    expect(monthYearNominative(7, 2026, "tr")).toBe("Temmuz 2026");
    expect(monthYearGenitive(7, 2026, "tr")).toBe("Temmuz 2026");
    expect(monthYearNominative(1, 2025, "tr")).toBe("Ocak 2025");
    expect(monthYearNominative(12, 2026, "tr")).toBe("Aralık 2026");
  });
});
