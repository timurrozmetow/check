import { and, asc, eq, inArray, lt } from "drizzle-orm";
import { db } from "../../db/index";
import {
  activityLog,
  decisionOptions,
  decisionRequests,
  files,
  projects,
  taskAssignees,
  tasks,
  taskUpdates,
  users,
} from "../../db/schema";
import { ACTIVE_TASK_STATUSES, type TaskStatus } from "../../shared/constants";
import { normalizePayload } from "../../shared/activity";

export interface ReportTaskRow {
  id: number;
  title: string;
  description: string | null;
  projectName: string;
  assignees: string[];
  status: TaskStatus;
  progress: number;
  createdAt: Date;
  completedAt: Date | null;
  deadline: Date | null;
  /** мс, только для завершённых */
  durationMs: number | null;
  deadlineMet: boolean | null;
}

export interface ReportTimelineEvent {
  type: string;
  payload: Record<string, unknown> | null;
  createdAt: Date;
  actorName: string;
}

export interface ReportDecision {
  title: string;
  type: "choice" | "approval";
  approved: boolean | null;
  selectedOption: string | null;
  comment: string | null;
  decidedAt: Date | null;
}

export interface ReportPhoto {
  absPath: string;
  originalName: string;
}

export interface CompletedTaskDetail {
  task: ReportTaskRow;
  timeline: ReportTimelineEvent[];
  decisions: ReportDecision[];
  photos: ReportPhoto[];
}

export interface ReportSummary {
  totalTasks: number;
  completedCount: number;
  inProgressCount: number;
  overdueCount: number;
  avgDurationMs: number | null;
  avgActiveProgress: number;
}

export interface ReportData {
  year: number;
  month: number;
  projectName: string | null;
  periodStart: Date;
  periodEnd: Date;
  summary: ReportSummary;
  tasks: ReportTaskRow[];
  statusCounts: Record<TaskStatus, number>;
  tasksByProject: { name: string; count: number }[];
  completedByWeek: number[];
  completedDetails: CompletedTaskDetail[];
}

function isOverdue(t: {
  deadline: Date | null;
  status: TaskStatus;
}): boolean {
  if (!t.deadline) return false;
  if (t.status === "completed" || t.status === "cancelled") return false;
  return t.deadline.getTime() < Date.now();
}

/** Номер недели месяца (0-based) для даты внутри периода. */
function weekOfMonth(date: Date): number {
  return Math.floor((date.getDate() - 1) / 7);
}

export async function gatherReportData(
  year: number,
  month: number,
  projectId?: number,
): Promise<ReportData> {
  const periodStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const periodEnd = new Date(year, month, 1, 0, 0, 0, 0);

  const projectFilter = projectId
    ? eq(tasks.projectId, projectId)
    : undefined;

  // Берём все задачи, созданные до конца периода; условие «жил в месяце»
  // (completedAt IS NULL OR completedAt >= start) досчитываем в JS.
  const rows = await db
    .select({
      t: tasks,
      projectName: projects.name,
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(lt(tasks.createdAt, periodEnd), projectFilter))
    .orderBy(asc(tasks.createdAt));

  // Условие «жил в месяце»: createdAt < end AND (completedAt IS NULL OR completedAt >= start)
  const filtered = rows.filter((r) => {
    if (r.t.createdAt.getTime() >= periodEnd.getTime()) return false;
    if (r.t.completedAt === null) return true;
    return r.t.completedAt.getTime() >= periodStart.getTime();
  });

  const taskIds = filtered.map((r) => r.t.id);

  // Исполнители
  const assigneeRows =
    taskIds.length > 0
      ? await db
          .select({
            taskId: taskAssignees.taskId,
            name: users.name,
          })
          .from(taskAssignees)
          .innerJoin(users, eq(taskAssignees.userId, users.id))
          .where(inArray(taskAssignees.taskId, taskIds))
      : [];
  const assigneesByTask = new Map<number, string[]>();
  for (const a of assigneeRows) {
    const list = assigneesByTask.get(a.taskId) ?? [];
    list.push(a.name);
    assigneesByTask.set(a.taskId, list);
  }

  const reportTasks: ReportTaskRow[] = filtered.map((r) => {
    const completed = r.t.completedAt;
    const durationMs =
      completed !== null
        ? completed.getTime() - r.t.createdAt.getTime()
        : null;
    const deadlineMet =
      completed !== null && r.t.deadline !== null
        ? completed.getTime() <= r.t.deadline.getTime()
        : null;
    return {
      id: r.t.id,
      title: r.t.title,
      description: r.t.description,
      projectName: r.projectName,
      assignees: assigneesByTask.get(r.t.id) ?? [],
      status: r.t.status,
      progress: r.t.progress,
      createdAt: r.t.createdAt,
      completedAt: completed,
      deadline: r.t.deadline,
      durationMs,
      deadlineMet,
    };
  });

  // Сводка
  const completedInMonth = reportTasks.filter(
    (t) =>
      t.completedAt !== null &&
      t.completedAt.getTime() >= periodStart.getTime() &&
      t.completedAt.getTime() < periodEnd.getTime(),
  );
  const activeTasks = reportTasks.filter((t) =>
    ACTIVE_TASK_STATUSES.includes(t.status),
  );
  const overdue = reportTasks.filter((t) => isOverdue(t));

  const durations = completedInMonth
    .map((t) => t.durationMs)
    .filter((d): d is number => d !== null);
  const avgDurationMs =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : null;
  const avgActiveProgress =
    activeTasks.length > 0
      ? Math.round(
          activeTasks.reduce((a, t) => a + t.progress, 0) / activeTasks.length,
        )
      : 0;

  const summary: ReportSummary = {
    totalTasks: reportTasks.length,
    completedCount: completedInMonth.length,
    inProgressCount: activeTasks.length,
    overdueCount: overdue.length,
    avgDurationMs,
    avgActiveProgress,
  };

  // Данные для графиков
  const statusCounts = {
    new: 0,
    in_progress: 0,
    review: 0,
    awaiting_decision: 0,
    completed: 0,
    paused: 0,
    cancelled: 0,
  } as Record<TaskStatus, number>;
  for (const t of reportTasks) statusCounts[t.status]++;

  const byProjectMap = new Map<string, number>();
  for (const t of reportTasks) {
    byProjectMap.set(t.projectName, (byProjectMap.get(t.projectName) ?? 0) + 1);
  }
  const tasksByProject = [...byProjectMap.entries()].map(([name, count]) => ({
    name,
    count,
  }));

  // Число недель в месяце
  const daysInMonth = new Date(year, month, 0).getDate();
  const weekCount = Math.ceil(daysInMonth / 7);
  const completedByWeek = new Array<number>(weekCount).fill(0);
  for (const t of completedInMonth) {
    if (t.completedAt) {
      const w = weekOfMonth(t.completedAt);
      if (w >= 0 && w < weekCount) completedByWeek[w] = (completedByWeek[w] ?? 0) + 1;
    }
  }

  // Детализация завершённых
  const completedDetails: CompletedTaskDetail[] = [];
  for (const t of completedInMonth) {
    const [timelineRows, decisionRows, photoRows] = await Promise.all([
      db
        .select({
          type: activityLog.type,
          payload: activityLog.payload,
          createdAt: activityLog.createdAt,
          actorName: users.name,
        })
        .from(activityLog)
        .innerJoin(users, eq(activityLog.actorId, users.id))
        .where(eq(activityLog.taskId, t.id))
        .orderBy(asc(activityLog.createdAt)),
      db
        .select({
          r: decisionRequests,
        })
        .from(decisionRequests)
        .where(
          and(
            eq(decisionRequests.taskId, t.id),
            eq(decisionRequests.status, "decided"),
          ),
        ),
      db
        .select({
          path: files.path,
          originalName: files.originalName,
        })
        .from(files)
        .innerJoin(taskUpdates, eq(files.entityId, taskUpdates.id))
        .where(
          and(
            eq(files.entityType, "task_update"),
            eq(taskUpdates.taskId, t.id),
            eq(taskUpdates.status, "approved"),
          ),
        ),
    ]);

    const decisions: ReportDecision[] = [];
    for (const d of decisionRows) {
      let selectedOption: string | null = null;
      if (d.r.type === "choice") {
        const [opt] = await db
          .select({ title: decisionOptions.title })
          .from(decisionOptions)
          .where(
            and(
              eq(decisionOptions.requestId, d.r.id),
              eq(decisionOptions.isSelected, true),
            ),
          )
          .limit(1);
        selectedOption = opt?.title ?? null;
      }
      decisions.push({
        title: d.r.title,
        type: d.r.type,
        approved: d.r.approved,
        selectedOption,
        comment: d.r.directorComment,
        decidedAt: d.r.decidedAt,
      });
    }

    const photos: ReportPhoto[] = photoRows
      .filter((p) => /\.(jpg|jpeg|png|webp)$/i.test(p.path))
      .map((p) => ({ absPath: p.path, originalName: p.originalName }));

    completedDetails.push({
      task: t,
      timeline: timelineRows.map((r) => ({
        type: r.type,
        payload: normalizePayload(r.payload),
        createdAt: r.createdAt,
        actorName: r.actorName,
      })),
      decisions,
      photos,
    });
  }

  let projectName: string | null = null;
  if (projectId) {
    const [p] = await db
      .select({ name: projects.name })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    projectName = p?.name ?? null;
  }

  return {
    year,
    month,
    projectName,
    periodStart,
    periodEnd,
    summary,
    tasks: reportTasks,
    statusCounts,
    tasksByProject,
    completedByWeek,
    completedDetails,
  };
}
