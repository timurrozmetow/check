import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  completedLinePng,
  projectsBarPng,
  statusDonutPng,
} from "./charts";

/** Считает не-белые пиксели — чтобы отличить реальный рисунок от пустого холста. */
async function nonWhitePixels(png: Buffer): Promise<number> {
  const { data, info } = await sharp(png)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i]! < 250 || data[i + 1]! < 250 || data[i + 2]! < 250) n++;
  }
  return n;
}

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

  // #7: единственный ненулевой статус (дуга 360°) не должен давать пустое кольцо
  it("донат с единственным статусом рисует непустое кольцо", async () => {
    const png = await statusDonutPng([
      { label: "Завершена", value: 5, color: "#22c55e" },
    ]);
    expect(isPng(png)).toBe(true);
    expect(await nonWhitePixels(png)).toBeGreaterThan(2000);
  });

  // #13: при большом числе проектов ширина столбца не должна уходить в минус
  it("столбцы для 32 проектов рендерятся (не пустая ось)", async () => {
    const many = Array.from({ length: 32 }, (_, i) => ({
      name: `Проект ${i + 1}`,
      count: (i % 5) + 1,
    }));
    const png = await projectsBarPng(many);
    expect(isPng(png)).toBe(true);
    expect(await nonWhitePixels(png)).toBeGreaterThan(2000);
  });
});
