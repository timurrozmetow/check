import { and, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index";
import { projects, taskAssignees, tasks } from "../../db/schema";
import { ACTIVE_TASK_STATUSES } from "../../shared/constants";
import { AppError, notFound } from "../../shared/errors";
import type { Role } from "../../shared/constants";
import type { CreateProjectInput, UpdateProjectInput } from "./schemas";

export interface ProjectWithStats {
  id: number;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  status: (typeof projects.$inferSelect)["status"];
  createdAt: Date;
  activeTaskCount: number;
  totalTaskCount: number;
  avgProgress: number;
}

/** Считает статистику задач для набора проектов одним запросом. */
async function statsByProject(projectIds: number[]) {
  const map = new Map<
    number,
    { active: number; total: number; progressSum: number }
  >();
  if (projectIds.length === 0) return map;

  const activeCase = sql<number>`sum(case when ${inArray(
    tasks.status,
    ACTIVE_TASK_STATUSES,
  )} then 1 else 0 end)`;
  const activeProgressSum = sql<number>`sum(case when ${inArray(
    tasks.status,
    ACTIVE_TASK_STATUSES,
  )} then ${tasks.progress} else 0 end)`;

  const rows = await db
    .select({
      projectId: tasks.projectId,
      total: count(tasks.id),
      active: activeCase,
      progressSum: activeProgressSum,
    })
    .from(tasks)
    .where(inArray(tasks.projectId, projectIds))
    .groupBy(tasks.projectId);

  for (const r of rows) {
    map.set(r.projectId, {
      active: Number(r.active ?? 0),
      total: Number(r.total ?? 0),
      progressSum: Number(r.progressSum ?? 0),
    });
  }
  return map;
}

function toStats(
  p: typeof projects.$inferSelect,
  s: { active: number; total: number; progressSum: number } | undefined,
): ProjectWithStats {
  const active = s?.active ?? 0;
  const progressSum = s?.progressSum ?? 0;
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    color: p.color,
    icon: p.icon,
    status: p.status,
    createdAt: p.createdAt,
    activeTaskCount: active,
    totalTaskCount: s?.total ?? 0,
    avgProgress: active > 0 ? Math.round(progressSum / active) : 0,
  };
}

export async function listProjects(
  role: Role,
  userId: number,
): Promise<ProjectWithStats[]> {
  let rows: (typeof projects.$inferSelect)[];

  if (role === "employee") {
    // Только проекты, где у сотрудника есть задачи
    rows = await db
      .selectDistinct({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        color: projects.color,
        icon: projects.icon,
        status: projects.status,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .innerJoin(tasks, eq(tasks.projectId, projects.id))
      .innerJoin(taskAssignees, eq(taskAssignees.taskId, tasks.id))
      .where(eq(taskAssignees.userId, userId));
  } else {
    rows = await db.select().from(projects).orderBy(projects.name);
  }

  const stats = await statsByProject(rows.map((r) => r.id));
  return rows
    .map((p) => toStats(p, stats.get(p.id)))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export async function getProjectWithStats(
  id: number,
): Promise<ProjectWithStats> {
  const [p] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  if (!p) throw notFound("Проект не найден");
  const stats = await statsByProject([id]);
  return toStats(p, stats.get(id));
}

export async function createProject(
  input: CreateProjectInput,
): Promise<ProjectWithStats> {
  const [inserted] = await db
    .insert(projects)
    .values({
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? "#6366f1",
      icon: input.icon ?? null,
    })
    .$returningId();
  return getProjectWithStats(inserted!.id);
}

export async function updateProject(
  id: number,
  input: UpdateProjectInput,
): Promise<ProjectWithStats> {
  await getProjectWithStats(id); // 404
  await db
    .update(projects)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    })
    .where(eq(projects.id, id));
  return getProjectWithStats(id);
}

export async function deleteProject(id: number): Promise<void> {
  await getProjectWithStats(id); // 404
  const [countRow] = await db
    .select({ value: count() })
    .from(tasks)
    .where(eq(tasks.projectId, id));
  if ((countRow?.value ?? 0) > 0) {
    throw new AppError(
      400,
      "PROJECT_HAS_TASKS",
      "Нельзя удалить проект с задачами",
    );
  }
  await db.delete(projects).where(eq(projects.id, id));
}
