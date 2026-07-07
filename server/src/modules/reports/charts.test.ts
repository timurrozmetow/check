import { describe, expect, it } from "vitest";
import {
  completedLinePng,
  projectsBarPng,
  statusDonutPng,
} from "./charts";

/** PNG-файл начинается с сигнатуры 0x89 'P' 'N' 'G'. */
function isPng(buf: Buffer): boolean {
  return (
    buf.length > 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  );
}

describe("charts", () => {
  it("донат статусов рендерится в PNG", async () => {
    const png = await statusDonutPng([
      { label: "В работе", value: 3, color: "#6366f1" },
      { label: "Завершена", value: 2, color: "#22c55e" },
    ]);
    expect(isPng(png)).toBe(true);
  });

  it("донат с нулевыми данными тоже валидный PNG", async () => {
    const png = await statusDonutPng([]);
    expect(isPng(png)).toBe(true);
  });

  it("столбцы по проектам рендерятся в PNG", async () => {
    const png = await projectsBarPng([
      { name: "Кофейня", count: 4 },
      { name: "Автомойка", count: 2 },
    ]);
    expect(isPng(png)).toBe(true);
  });

  it("линия по неделям рендерится в PNG", async () => {
    const png = await completedLinePng([1, 0, 3, 2]);
    expect(isPng(png)).toBe(true);
  });
});
