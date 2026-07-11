import { describe, expect, it } from "vitest";
import { t, resolveLocale, hasKey } from "./index";

describe("server i18n", () => {
  it("переводит ключ по локали", () => {
    expect(t("ru", "error.taskNotFound")).toBe("Задача не найдена");
    expect(t("tr", "error.taskNotFound")).toBe("Görev bulunamadı");
  });

  it("фолбэк: локаль → ru → сам ключ", () => {
    expect(t("tr", "error.internal")).toBe("Sunucu iç hatası");
    expect(t("ru", "totally.absent.key")).toBe("totally.absent.key");
  });

  it("интерполяция {{param}}", () => {
    expect(t("ru", "report.coverProject", { name: "X" })).toBe("Проект: X");
    expect(t("tr", "report.coverProject", { name: "X" })).toBe("Proje: X");
  });

  it("resolveLocale по заголовку", () => {
    expect(resolveLocale("tr")).toBe("tr");
    expect(resolveLocale("tr-TR")).toBe("tr");
    expect(resolveLocale("en-US")).toBe("ru");
    expect(resolveLocale(undefined)).toBe("ru");
    expect(resolveLocale(["tr", "ru"])).toBe("tr");
  });

  it("hasKey", () => {
    expect(hasKey("validation.passwordMin")).toBe(true);
    expect(hasKey("validation.doesNotExist")).toBe(false);
  });
});
