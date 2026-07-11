import sharp from "sharp";
import { t, type Locale } from "../../shared/i18n";

const FONT = 'font-family="Arial, sans-serif"';
const PALETTE = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#a855f7",
  "#64748b",
];

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function svgToPng(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function emptyChart(
  width: number,
  height: number,
  title: string,
  locale: Locale,
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#ffffff"/>
    <text x="${width / 2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#1e293b" ${FONT}>${esc(title)}</text>
    <text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-size="16" fill="#94a3b8" ${FONT}>${esc(t(locale, "report.chart.noData"))}</text>
  </svg>`;
}

/** Donut «Задачи по статусам». */
export async function statusDonutPng(
  data: { label: string; value: number; color: string }[],
  locale: Locale = "ru",
): Promise<Buffer> {
  const width = 800;
  const height = 400;
  const title = t(locale, "report.chart.byStatus");
  const items = data.filter((d) => d.value > 0);
  const total = items.reduce((a, d) => a + d.value, 0);
  if (total === 0) return svgToPng(emptyChart(width, height, title, locale));

  const cx = 240;
  const cy = 220;
  const rOuter = 130;
  const rInner = 72;
  let angle = -Math.PI / 2;
  const segments: string[] = [];

  for (const item of items) {
    const frac = item.value / total;
    const next = angle + frac * Math.PI * 2;
    // Единственный ненулевой статус: дуга в 360° вырождается (начало = конец)
    // и не рисуется. Рисуем полное кольцо двумя окружностями.
    if (frac > 0.9999) {
      segments.push(
        `<circle cx="${cx}" cy="${cy}" r="${rOuter}" fill="${item.color}"/>` +
          `<circle cx="${cx}" cy="${cy}" r="${rInner}" fill="#ffffff"/>`,
      );
      angle = next;
      continue;
    }
    const largeArc = frac > 0.5 ? 1 : 0;
    const x1 = cx + rOuter * Math.cos(angle);
    const y1 = cy + rOuter * Math.sin(angle);
    const x2 = cx + rOuter * Math.cos(next);
    const y2 = cy + rOuter * Math.sin(next);
    const x3 = cx + rInner * Math.cos(next);
    const y3 = cy + rInner * Math.sin(next);
    const x4 = cx + rInner * Math.cos(angle);
    const y4 = cy + rInner * Math.sin(angle);
    segments.push(
      `<path d="M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z" fill="${item.color}"/>`,
    );
    angle = next;
  }

  const legend = items
    .map((item, i) => {
      const y = 90 + i * 30;
      return `<rect x="470" y="${y}" width="16" height="16" rx="3" fill="${item.color}"/>
      <text x="494" y="${y + 13}" font-size="15" fill="#334155" ${FONT}>${esc(item.label)} — ${item.value}</text>`;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#ffffff"/>
    <text x="40" y="36" font-size="20" font-weight="bold" fill="#1e293b" ${FONT}>${esc(title)}</text>
    ${segments.join("\n")}
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="30" font-weight="bold" fill="#1e293b" ${FONT}>${total}</text>
    <text x="${cx}" y="${cy + 20}" text-anchor="middle" font-size="14" fill="#64748b" ${FONT}>${esc(t(locale, "report.chart.total"))}</text>
    ${legend}
  </svg>`;
  return svgToPng(svg);
}

/** Bar «Задачи по проектам». */
export async function projectsBarPng(
  data: { name: string; count: number }[],
  locale: Locale = "ru",
): Promise<Buffer> {
  const width = 800;
  const height = 400;
  const title = t(locale, "report.chart.byProject");
  if (data.length === 0) return svgToPng(emptyChart(width, height, title, locale));

  const marginLeft = 50;
  const marginRight = 40;
  const marginTop = 60;
  const marginBottom = 80;
  const chartW = width - marginLeft - marginRight;
  const chartH = height - marginTop - marginBottom;
  const maxVal = Math.max(...data.map((d) => d.count), 1);
  // Зазор ужимаем при большом числе проектов, ширину столбца держим положительной,
  // иначе (≈29+ проектов) числитель уходит в минус и столбцы вовсе не рисуются.
  const barGap = Math.min(24, chartW / (data.length + 1) / 2);
  const barW = Math.max(
    4,
    Math.min(120, (chartW - barGap * (data.length + 1)) / data.length),
  );
  const baseY = marginTop + chartH;

  const bars = data
    .map((d, i) => {
      const h = (d.count / maxVal) * chartH;
      const x = marginLeft + barGap + i * (barW + barGap);
      const y = baseY - h;
      const color = PALETTE[i % PALETTE.length];
      const label =
        d.name.length > 16 ? d.name.slice(0, 15) + "…" : d.name;
      return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="6" fill="${color}"/>
      <text x="${x + barW / 2}" y="${y - 8}" text-anchor="middle" font-size="15" font-weight="bold" fill="#1e293b" ${FONT}>${d.count}</text>
      <text x="${x + barW / 2}" y="${baseY + 22}" text-anchor="middle" font-size="13" fill="#475569" ${FONT}>${esc(label)}</text>`;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#ffffff"/>
    <text x="40" y="36" font-size="20" font-weight="bold" fill="#1e293b" ${FONT}>${esc(title)}</text>
    <line x1="${marginLeft}" y1="${baseY}" x2="${width - marginRight}" y2="${baseY}" stroke="#cbd5e1" stroke-width="1"/>
    ${bars}
  </svg>`;
  return svgToPng(svg);
}

/** Line «Завершено по неделям месяца». */
export async function completedLinePng(
  weeks: number[],
  locale: Locale = "ru",
): Promise<Buffer> {
  const width = 800;
  const height = 400;
  const title = t(locale, "report.chart.byWeekFull");
  if (weeks.length === 0 || weeks.every((w) => w === 0)) {
    return svgToPng(emptyChart(width, height, title, locale));
  }

  const marginLeft = 50;
  const marginRight = 40;
  const marginTop = 60;
  const marginBottom = 60;
  const chartW = width - marginLeft - marginRight;
  const chartH = height - marginTop - marginBottom;
  const maxVal = Math.max(...weeks, 1);
  const baseY = marginTop + chartH;
  const stepX = weeks.length > 1 ? chartW / (weeks.length - 1) : 0;

  const points = weeks.map((v, i) => {
    const x = marginLeft + (weeks.length > 1 ? i * stepX : chartW / 2);
    const y = baseY - (v / maxVal) * chartH;
    return { x, y, v, i };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const dots = points
    .map(
      (p) =>
        `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#6366f1"/>
       <text x="${p.x}" y="${p.y - 12}" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b" ${FONT}>${p.v}</text>
       <text x="${p.x}" y="${baseY + 22}" text-anchor="middle" font-size="13" fill="#475569" ${FONT}>${esc(t(locale, "report.chart.weekShort", { n: p.i + 1 }))}</text>`,
    )
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#ffffff"/>
    <text x="40" y="36" font-size="20" font-weight="bold" fill="#1e293b" ${FONT}>${esc(title)}</text>
    <line x1="${marginLeft}" y1="${baseY}" x2="${width - marginRight}" y2="${baseY}" stroke="#cbd5e1" stroke-width="1"/>
    <polyline points="${polyline}" fill="none" stroke="#6366f1" stroke-width="3" stroke-linejoin="round"/>
    ${dots}
  </svg>`;
  return svgToPng(svg);
}
