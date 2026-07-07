import { asc, desc, eq, inArray, type SQL } from "drizzle-orm";
import { db, type Db, type Tx } from "../../db/index";
import {
  decisionOptions,
  decisionRequests,
  taskAssignees,
  tasks,
  projects,
  type DecisionOptionRow,
} from "../../db/schema";
import type { DecisionStatus, DecisionType } from "../../shared/constants";
import { badRequest, notFound } from "../../shared/errors";
import { logActivity } from "../../shared/activity";
import { notify, type NotifyInput } from "../../shared/notify";
import { getFilesFor, type FileInfo } from "../../shared/file-info";
import { getAdminIds, getDirectorIds } from "../../shared/recipients";
import type { CreateDecisionInput, DecideInput } from "./schemas";

export interface DecisionOptionDto {
  id: number;
  title: string;
  description: string | null;
  isSelected: boolean;
  files: FileInfo[];
}

export interface DecisionRequestDetail {
  id: number;
  taskId: number;
  task: {
    id: number;
    title: string;
    projectId: number;
    projectName: string;
    projectColor: string;
  };
  title: string;
  description: string | null;
  type: DecisionType;
  status: DecisionStatus;
  approved: boolean | null;
  directorComment: string | null;
  createdAt: Date;
  decidedAt: Date | null;
  options: DecisionOptionDto[];
  files: FileInfo[];
}

/**
 * Загружает запросы решений с задачей/проектом, вариантами и файлами.
 * Сортировка — по createdAt desc.
 */
async function fetchDetails(
  dbOrTx: Db | Tx,
  where: SQL | undefined,
): Promise<DecisionRequestDetail[]> {
  const rows = await dbOrTx
    .select({
      request: decisionRequests,
      taskTitle: tasks.title,
      projectId: projects.id,
      projectName: projects.name,
      projectColor: projects.color,
    })
    .from(decisionRequests)
    .innerJoin(tasks, eq(decisionRequests.taskId, tasks.id))
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(where)
    .orderBy(desc(decisionRequests.createdAt), desc(decisionRequests.id));

  if (rows.length === 0) return [];

  const requestIds = rows.map((r) => r.request.id);
  const optionRows = await dbOrTx
    .select()
    .from(decisionOptions)
    .where(inArray(decisionOptions.requestId, requestIds))
    .orderBy(asc(decisionOptions.id));

  const [requestFiles, optionFiles] = await Promise.all([
    getFilesFor(dbOrTx, "decision_request", requestIds),
    getFilesFor(
      dbOrTx,
      "decision_option",
      optionRows.map((o) => o.id),
    ),
  ]);

  const optionsByRequest = new Map<number, DecisionOptionDto[]>();
  for (const o of optionRows) {
    const list = optionsByRequest.get(o.requestId) ?? [];
    list.push({
      id: o.id,
      title: o.title,
      description: o.description,
      isSelected: o.isSelected,
      files: optionFiles.get(o.id) ?? [],
    });
    optionsByRequest.set(o.requestId, list);
  }

  return rows.map((row) => ({
    id: row.request.id,
    taskId: row.request.taskId,
    task: {
      id: row.request.taskId,
      title: row.taskTitle,
      projectId: row.projectId,
      projectName: row.projectName,
      projectColor: row.projectColor,
    },
    title: row.request.title,
    description: row.request.description,
    type: row.request.type,
    status: row.request.status,
    approved: row.request.approved,
    directorComment: row.request.directorComment,
    createdAt: row.request.createdAt,
    decidedAt: row.request.decidedAt,
    options: optionsByRequest.get(row.request.id) ?? [],
    files: requestFiles.get(row.request.id) ?? [],
  }));
}

export async function listDecisions(
  status?: DecisionStatus,
): Promise<DecisionRequestDetail[]> {
  return fetchDetails(
    db,
    status ? eq(decisionRequests.status, status) : undefined,
  );
}

export async function getDecision(id: number): Promise<DecisionRequestDetail> {
  const [detail] = await fetchDetails(db, eq(decisionRequests.id, id));
  if (!detail) throw notFound("Запрос решения не найден");
  return detail;
}

export async function createDecision(
  input: CreateDecisionInput,
  actorId: number,
): Promise<DecisionRequestDetail> {
  const [task] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.id, input.taskId))
    .limit(1);
  if (!task) throw notFound("Задача не найдена");

  if (
    input.type === "choice" &&
    (!input.options || input.options.length < 2)
  ) {
    throw badRequest(
      "Для запроса с выбором нужно минимум два варианта",
      "NEED_OPTIONS",
    );
  }

  const requestId = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(decisionRequests)
      .values({
        taskId: input.taskId,
        title: input.title,
        description: input.description ?? null,
        type: input.type,
        createdBy: actorId,
      })
      .$returningId();
    const newId = inserted!.id;

    if (input.type === "choice" && input.options) {
      await tx.insert(decisionOptions).values(
        input.options.map((o) => ({
          requestId: newId,
          title: o.title,
          description: o.description ?? null,
        })),
      );
    }

    await tx
      .update(tasks)
      .set({ status: "awaiting_decision" })
      .where(eq(tasks.id, input.taskId));

    await logActivity(tx, {
      taskId: input.taskId,
      actorId,
      type: "decision_requested",
      payload: { title: input.title },
    });

    const directorIds = await getDirectorIds(tx);
    await notify(
      tx,
      directorIds.map(
        (userId): NotifyInput => ({
          userId,
          type: "decision_requested",
          title: "Требуется ваше решение",
          body: input.title,
          link: "/decisions",
        }),
      ),
    );

    return newId;
  });

  return getDecision(requestId);
}

export async function decideDecision(
  id: number,
  input: DecideInput,
  actorId: number,
): Promise<DecisionRequestDetail> {
  const [row] = await db
    .select({ request: decisionRequests, taskStatus: tasks.status })
    .from(decisionRequests)
    .innerJoin(tasks, eq(decisionRequests.taskId, tasks.id))
    .where(eq(decisionRequests.id, id))
    .limit(1);
  if (!row) throw notFound("Запрос решения не найден");

  const { request, taskStatus } = row;
  if (request.status === "decided") {
    throw badRequest("Решение уже принято", "ALREADY_DECIDED");
  }

  let selectedOption: DecisionOptionRow | undefined;
  let approvedValue: boolean | null = null;

  if (request.type === "choice") {
    if (input.optionId === undefined) {
      throw badRequest("Не выбран вариант", "INVALID_OPTION");
    }
    const options = await db
      .select()
      .from(decisionOptions)
      .where(eq(decisionOptions.requestId, id));
    selectedOption = options.find((o) => o.id === input.optionId);
    if (!selectedOption) {
      throw badRequest(
        "Вариант не относится к этому запросу",
        "INVALID_OPTION",
      );
    }
  } else {
    if (typeof input.approved !== "boolean") {
      throw badRequest("Укажите решение: согласовать или отклонить");
    }
    approvedValue = input.approved;
  }

  const comment = input.comment ?? null;
  const chosen = selectedOption;

  await db.transaction(async (tx) => {
    await tx
      .update(decisionRequests)
      .set({
        status: "decided",
        decidedAt: new Date(),
        directorComment: comment,
        approved: approvedValue,
      })
      .where(eq(decisionRequests.id, id));

    if (chosen) {
      await tx
        .update(decisionOptions)
        .set({ isSelected: true })
        .where(eq(decisionOptions.id, chosen.id));
    }

    if (taskStatus === "awaiting_decision") {
      await tx
        .update(tasks)
        .set({ status: "in_progress" })
        .where(eq(tasks.id, request.taskId));
    }

    const payload: Record<string, unknown> = {
      title: request.title,
      comment,
    };
    if (chosen) {
      payload.option = chosen.title;
    } else {
      payload.approved = approvedValue;
    }

    await logActivity(tx, {
      taskId: request.taskId,
      actorId,
      type: "decision_made",
      payload,
    });

    const [adminIds, assigneeRows] = await Promise.all([
      getAdminIds(tx),
      tx
        .select({ userId: taskAssignees.userId })
        .from(taskAssignees)
        .where(eq(taskAssignees.taskId, request.taskId)),
    ]);
    const recipientIds = new Set<number>([
      ...adminIds,
      ...assigneeRows.map((r) => r.userId),
    ]);

    const body = chosen
      ? `«${request.title}» — выбран вариант «${chosen.title}»`
      : `«${request.title}» — ${approvedValue ? "согласовано" : "отклонено"}`;

    await notify(
      tx,
      [...recipientIds].map(
        (userId): NotifyInput => ({
          userId,
          type: "decision_made",
          title: "Директор принял решение",
          body,
          link: `/tasks/${request.taskId}`,
        }),
      ),
    );
  });

  return getDecision(id);
}
