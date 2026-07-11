import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { env } from "../../shared/env";
import { t, type Locale } from "../../shared/i18n";
import { activityLabel, taskStatusLabel } from "./labels";
import {
  completedLinePng,
  projectsBarPng,
  statusDonutPng,
} from "./charts";
import {
  formatDateRu,
  formatDateTimeRu,
  formatDurationRu,
  monthYearGenitive,
  monthYearNominative,
} from "../../shared/ru-format";
import type { CompletedTaskDetail, ReportData } from "./service";
import type { TaskStatus } from "../../shared/constants";

const STATUS_COLORS: Record<TaskStatus, string> = {
  new: "#64748b",
  in_progress: "#6366f1",
  review: "#f59e0b",
  awaiting_decision: "#a855f7",
  completed: "#22c55e",
  paused: "#94a3b8",
  cancelled: "#ef4444",
};

const uploadsRoot = path.resolve(env.UPLOADS_DIR);

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text })],
  });
}

function para(text: string, opts: { bold?: boolean; color?: string } = {}) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text, bold: opts.bold, color: opts.color }),
    ],
  });
}

function summaryTable(data: ReportData, locale: Locale): Table {
  const rows: [string, string][] = [
    [t(locale, "report.sumTotal"), String(data.summary.totalTasks)],
    [t(locale, "report.sumCompleted"), String(data.summary.completedCount)],
    [t(locale, "report.sumInProgress"), String(data.summary.inProgressCount)],
    [t(locale, "report.sumOverdue"), String(data.summary.overdueCount)],
    [
      t(locale, "report.sumAvgDuration"),
      data.summary.avgDurationMs !== null
        ? formatDurationRu(data.summary.avgDurationMs, locale)
        : "—",
    ],
    [t(locale, "report.sumAvgProgress"), `${data.summary.avgActiveProgress}%`],
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 60, type: WidthType.PERCENTAGE },
              children: [para(label)],
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              children: [para(value, { bold: true })],
            }),
          ],
        }),
    ),
  });
}

function cell(text: string, opts: { bold?: boolean; header?: boolean } = {}) {
  return new TableCell({
    shading: opts.header
      ? { type: ShadingType.SOLID, color: "6366f1", fill: "6366f1" }
      : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: opts.bold ?? opts.header,
            color: opts.header ? "ffffff" : undefined,
            size: 18,
          }),
        ],
      }),
    ],
  });
}

function tasksTable(data: ReportData, locale: Locale): Table {
  const header = new TableRow({
    tableHeader: true,
    children: [
      cell("№", { header: true }),
      cell(t(locale, "report.thTask"), { header: true }),
      cell(t(locale, "report.thProject"), { header: true }),
      cell(t(locale, "report.thAssignee"), { header: true }),
      cell(t(locale, "report.thStatus"), { header: true }),
      cell("%", { header: true }),
      cell(t(locale, "report.thTime"), { header: true }),
      cell(t(locale, "report.thDeadline"), { header: true }),
    ],
  });

  const rows = data.tasks.map((tk, i) => {
    let deadlineText = "—";
    if (tk.deadline) {
      if (tk.deadlineMet === true) deadlineText = t(locale, "report.deadlineMet");
      else if (tk.deadlineMet === false)
        deadlineText = t(locale, "report.deadlineMissed");
      else deadlineText = formatDateRu(tk.deadline);
    }
    return new TableRow({
      children: [
        cell(String(i + 1)),
        cell(tk.title),
        cell(tk.projectName),
        cell(tk.assignees.join(", ") || "—"),
        cell(taskStatusLabel(tk.status, locale)),
        cell(`${tk.progress}%`),
        cell(tk.durationMs !== null ? formatDurationRu(tk.durationMs, locale) : "—"),
        cell(deadlineText),
      ],
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "cbd5e1" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "cbd5e1" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "cbd5e1" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "cbd5e1" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
    },
    rows: [header, ...rows],
  });
}

function chartParagraph(png: Buffer): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 160 },
    children: [
      new ImageRun({
        data: png,
        transformation: { width: 600, height: 300 },
        type: "png",
      }),
    ],
  });
}

function timelineText(
  event: CompletedTaskDetail["timeline"][number],
  locale: Locale,
): string {
  const base = event.type
    ? activityLabel(event.type, locale)
    : event.type;
  const p = event.payload ?? {};
  let extra = "";
  if (event.type === "status_changed" && p.to) {
    extra = `: ${taskStatusLabel(p.to as TaskStatus, locale)}`;
  } else if (event.type === "progress_changed" && p.to !== undefined) {
    extra = `: ${p.from ?? 0}% → ${p.to}%`;
  } else if (event.type === "update_approved" && typeof p.text === "string") {
    extra = `: ${p.text.slice(0, 100)}`;
  } else if (
    (event.type === "decision_requested" || event.type === "decision_made") &&
    typeof p.title === "string"
  ) {
    extra = `: ${p.title}`;
  }
  return `${formatDateTimeRu(event.createdAt, locale)} — ${base}${extra} (${event.actorName})`;
}

async function photoRuns(detail: CompletedTaskDetail): Promise<Paragraph[]> {
  const result: Paragraph[] = [];
  for (const photo of detail.photos.slice(0, 6)) {
    try {
      const abs = path.join(uploadsRoot, photo.absPath);
      const buf = await fs.readFile(abs);
      const resized = await sharp(buf)
        .resize({ width: 400, withoutEnlargement: true })
        .png()
        .toBuffer();
      const meta = await sharp(resized).metadata();
      const w = meta.width ?? 400;
      const h = meta.height ?? 300;
      result.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new ImageRun({
              data: resized,
              transformation: { width: w, height: h },
              type: "png",
            }),
          ],
        }),
      );
    } catch {
      // файл недоступен — пропускаем
    }
  }
  return result;
}

export async function buildMonthlyReport(
  data: ReportData,
  locale: Locale = "ru",
): Promise<Buffer> {
  const donutData = (Object.keys(data.statusCounts) as TaskStatus[]).map(
    (status) => ({
      label: taskStatusLabel(status, locale),
      value: data.statusCounts[status],
      color: STATUS_COLORS[status],
    }),
  );

  const [donutPng, barPng, linePng] = await Promise.all([
    statusDonutPng(donutData, locale),
    projectsBarPng(data.tasksByProject, locale),
    completedLinePng(data.completedByWeek, locale),
  ]);

  const monthTitle = monthYearGenitive(data.month, data.year, locale);
  const monthShort = monthYearNominative(data.month, data.year, locale);
  const projectName = data.projectName ?? t(locale, "report.allProjects");

  // Титульная страница
  const titleChildren: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 2000, after: 200 },
      children: [
        new TextRun({ text: "DirectorHub", bold: true, size: 56, color: "6366f1" }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: t(locale, "report.coverTitle", { period: monthTitle }),
          bold: true,
          size: 36,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: t(locale, "report.coverProject", { name: projectName }),
          size: 26,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: t(locale, "report.coverDate", { date: formatDateRu(new Date()) }),
          size: 22,
          color: "64748b",
        }),
      ],
    }),
    new Paragraph({ children: [], pageBreakBefore: false }),
  ];

  // Детализация завершённых задач
  const detailChildren: Paragraph[] = [];
  if (data.completedDetails.length > 0) {
    detailChildren.push(
      heading(t(locale, "report.detailsHeading"), HeadingLevel.HEADING_1),
    );
    for (const detail of data.completedDetails) {
      detailChildren.push(heading(detail.task.title, HeadingLevel.HEADING_2));
      if (detail.task.description) {
        detailChildren.push(para(detail.task.description));
      }
      detailChildren.push(
        para(
          t(locale, "report.detailMeta", {
            project: detail.task.projectName,
            assignees: detail.task.assignees.join(", ") || "—",
            time:
              detail.task.durationMs !== null
                ? formatDurationRu(detail.task.durationMs, locale)
                : "—",
          }),
          { color: "64748b" },
        ),
      );

      if (detail.timeline.length > 0) {
        detailChildren.push(
          para(t(locale, "report.timelineLabel"), { bold: true }),
        );
        for (const ev of detail.timeline) {
          detailChildren.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: 40 },
              children: [new TextRun({ text: timelineText(ev, locale), size: 20 })],
            }),
          );
        }
      }

      if (detail.decisions.length > 0) {
        detailChildren.push(
          para(t(locale, "report.decisionsLabel"), { bold: true }),
        );
        for (const d of detail.decisions) {
          let text = d.title;
          if (d.type === "choice" && d.selectedOption) {
            text += ` — ${t(locale, "report.decisionChoice", { option: d.selectedOption })}`;
          } else if (d.type === "approval") {
            text += ` — ${t(locale, d.approved ? "report.decisionApproved" : "report.decisionRejected")}`;
          }
          if (d.comment)
            text += `. ${t(locale, "report.decisionComment", { comment: d.comment })}`;
          detailChildren.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { after: 40 },
              children: [new TextRun({ text, size: 20 })],
            }),
          );
        }
      }

      if (detail.photos.length > 0) {
        detailChildren.push(
          para(t(locale, "report.photosLabel"), { bold: true }),
        );
        const photos = await photoRuns(detail);
        detailChildren.push(...photos);
      }
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: t(locale, "report.headerLine", { period: monthTitle }),
                    size: 16,
                    color: "94a3b8",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: t(locale, "report.pagePrefix"), size: 16, color: "94a3b8" }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: "94a3b8",
                  }),
                  new TextRun({ text: t(locale, "report.pageOf"), size: 16, color: "94a3b8" }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: "94a3b8",
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...titleChildren,
          new Paragraph({ pageBreakBefore: true, children: [] }),
          heading(t(locale, "report.summaryHeading"), HeadingLevel.HEADING_1),
          summaryTable(data, locale),
          heading(t(locale, "report.chartsHeading"), HeadingLevel.HEADING_1),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: t(locale, "report.chart.byStatus"), bold: true, size: 20 })],
          }),
          chartParagraph(donutPng),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: t(locale, "report.chart.byProject"), bold: true, size: 20 })],
          }),
          chartParagraph(barPng),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: t(locale, "report.chart.byWeek"), bold: true, size: 20 })],
          }),
          chartParagraph(linePng),
          new Paragraph({ pageBreakBefore: true, children: [] }),
          heading(t(locale, "report.tasksHeading", { period: monthShort }), HeadingLevel.HEADING_1),
          tasksTable(data, locale),
          ...detailChildren,
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
