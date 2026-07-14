import {
  boolean,
  datetime,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";
import {
  ACTIVITY_TYPES,
  DECISION_STATUSES,
  DECISION_TYPES,
  FILE_ENTITY_TYPES,
  NOTIFICATION_TYPES,
  PROJECT_STATUSES,
  ROLES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  UPDATE_STATUSES,
} from "../shared/constants";

export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 190 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: mysqlEnum("role", ROLES).notNull().default("employee"),
    avatar: varchar("avatar", { length: 255 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("users_role_idx").on(t.role)],
);

export const projects = mysqlTable(
  "projects",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    color: varchar("color", { length: 20 }).notNull().default("#6366f1"),
    icon: varchar("icon", { length: 40 }),
    status: mysqlEnum("status", PROJECT_STATUSES).notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("projects_status_idx").on(t.status)],
);

export const tasks = mysqlTable(
  "tasks",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    projectId: int("project_id")
      .notNull()
      .references(() => projects.id),
    status: mysqlEnum("status", TASK_STATUSES).notNull().default("new"),
    progress: tinyint("progress", { unsigned: true }).notNull().default(0),
    priority: mysqlEnum("priority", TASK_PRIORITIES)
      .notNull()
      .default("medium"),
    deadline: datetime("deadline"),
    createdBy: int("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    completedAt: datetime("completed_at"),
    /** Когда по задаче в последний раз отправлено напоминание о дедлайне
     * (сбрасывается в null при смене дедлайна). Защита от повторов. */
    deadlineRemindedAt: datetime("deadline_reminded_at"),
  },
  (t) => [
    index("tasks_project_idx").on(t.projectId),
    index("tasks_status_idx").on(t.status),
    index("tasks_created_idx").on(t.createdAt),
    index("tasks_completed_idx").on(t.completedAt),
    index("tasks_deadline_idx").on(t.deadline),
  ],
);

export const taskAssignees = mysqlTable(
  "task_assignees",
  {
    taskId: int("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.taskId, t.userId] }),
    index("assignees_user_idx").on(t.userId),
  ],
);

export const taskUpdates = mysqlTable(
  "task_updates",
  {
    id: int("id").autoincrement().primaryKey(),
    taskId: int("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    authorId: int("author_id")
      .notNull()
      .references(() => users.id),
    text: text("text").notNull(),
    status: mysqlEnum("status", UPDATE_STATUSES).notNull().default("pending"),
    rejectReason: text("reject_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    reviewedAt: datetime("reviewed_at"),
    reviewedBy: int("reviewed_by").references(() => users.id),
  },
  (t) => [
    index("updates_task_idx").on(t.taskId),
    index("updates_status_idx").on(t.status),
    index("updates_author_idx").on(t.authorId),
  ],
);

export const decisionRequests = mysqlTable(
  "decision_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    taskId: int("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    type: mysqlEnum("type", DECISION_TYPES).notNull(),
    status: mysqlEnum("status", DECISION_STATUSES)
      .notNull()
      .default("pending"),
    /** Для type=approval: true — согласовано, false — отклонено. */
    approved: boolean("approved"),
    directorComment: text("director_comment"),
    createdBy: int("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    decidedAt: datetime("decided_at"),
  },
  (t) => [
    index("decisions_task_idx").on(t.taskId),
    index("decisions_status_idx").on(t.status),
  ],
);

export const decisionOptions = mysqlTable(
  "decision_options",
  {
    id: int("id").autoincrement().primaryKey(),
    requestId: int("request_id")
      .notNull()
      .references(() => decisionRequests.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    isSelected: boolean("is_selected").notNull().default(false),
  },
  (t) => [index("options_request_idx").on(t.requestId)],
);

export const files = mysqlTable(
  "files",
  {
    id: int("id").autoincrement().primaryKey(),
    entityType: mysqlEnum("entity_type", FILE_ENTITY_TYPES).notNull(),
    entityId: int("entity_id").notNull(),
    path: varchar("path", { length: 255 }).notNull(),
    thumbPath: varchar("thumb_path", { length: 255 }),
    mime: varchar("mime", { length: 100 }).notNull(),
    size: int("size").notNull(),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    uploadedBy: int("uploaded_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("files_entity_idx").on(t.entityType, t.entityId)],
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", NOTIFICATION_TYPES).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    body: varchar("body", { length: 500 }),
    /** Структурные данные для локализации тела на клиенте (напр. decision_made). */
    params: json("params").$type<Record<string, unknown>>(),
    link: varchar("link", { length: 255 }),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.isRead)],
);

export const activityLog = mysqlTable(
  "activity_log",
  {
    id: int("id").autoincrement().primaryKey(),
    taskId: int("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    actorId: int("actor_id")
      .notNull()
      .references(() => users.id),
    type: mysqlEnum("type", ACTIVITY_TYPES).notNull(),
    payload: json("payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("activity_task_idx").on(t.taskId),
    index("activity_created_idx").on(t.createdAt),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type TaskRow = typeof tasks.$inferSelect;
export type TaskUpdateRow = typeof taskUpdates.$inferSelect;
export type DecisionRequestRow = typeof decisionRequests.$inferSelect;
export type DecisionOptionRow = typeof decisionOptions.$inferSelect;
export type FileRow = typeof files.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
export type ActivityRow = typeof activityLog.$inferSelect;
