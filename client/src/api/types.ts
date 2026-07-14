/**
 * Типы DTO — зеркало docs/api-contract.md.
 * Все даты приходят ISO-строками.
 */

export type Role = "admin" | "director" | "employee";

export type TaskStatus =
  | "new"
  | "in_progress"
  | "review"
  | "awaiting_decision"
  | "completed"
  | "paused"
  | "cancelled";

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type UpdateStatus = "pending" | "approved" | "rejected";
export type DecisionType = "choice" | "approval";
export type DecisionStatus = "pending" | "decided";
export type ProjectStatus = "active" | "archived";
export type FileEntityType =
  | "task"
  | "task_update"
  | "decision_request"
  | "decision_option";

export type NotificationType =
  | "task_assigned"
  | "update_submitted"
  | "update_approved"
  | "update_rejected"
  | "decision_requested"
  | "decision_made"
  | "deadline_soon";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  avatar: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface FileInfo {
  id: number;
  entityType: FileEntityType;
  entityId: number;
  url: string;
  thumbUrl: string | null;
  mime: string;
  size: number;
  originalName: string;
  createdAt: string;
}

export interface AssigneeInfo {
  id: number;
  name: string;
  avatar: string | null;
}

export interface TaskListItem {
  id: number;
  title: string;
  description: string | null;
  projectId: number;
  project: { id: number; name: string; color: string; icon: string | null };
  status: TaskStatus;
  progress: number;
  priority: TaskPriority;
  deadline: string | null;
  createdAt: string;
  completedAt: string | null;
  assignees: AssigneeInfo[];
  pendingUpdatesCount: number;
  hasPendingDecision: boolean;
}

export type TaskDetail = TaskListItem & { files: FileInfo[] };

export interface ActivityItem {
  id: number;
  type: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: number; name: string };
}

export interface UpdateItem {
  id: number;
  taskId: number;
  author: AssigneeInfo;
  text: string;
  status: UpdateStatus;
  rejectReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  files: FileInfo[];
}

export type ModerationItem = UpdateItem & {
  task: { id: number; title: string; projectName: string };
};

export type MyUpdateItem = UpdateItem & {
  task: { id: number; title: string };
};

export interface DecisionOption {
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
  createdAt: string;
  decidedAt: string | null;
  options: DecisionOption[];
  files: FileInfo[];
}

export interface ProjectWithStats {
  id: number;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  status: ProjectStatus;
  createdAt: string;
  activeTaskCount: number;
  totalTaskCount: number;
  avgProgress: number;
}

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string | null;
  params: Record<string, unknown> | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ApiError {
  error: { code: string; message: string };
}
