import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./client";
import type {
  AppNotification,
  DecisionRequestDetail,
  DecisionStatus,
  ModerationItem,
  MyUpdateItem,
  ProjectWithStats,
  TaskDetail,
  TaskListItem,
  TaskPriority,
  TaskStatus,
  ActivityItem,
  UpdateItem,
  User,
} from "./types";

/* ---------- Projects ---------- */

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => api<{ projects: ProjectWithStats[] }>("/projects"),
    select: (d) => d.projects,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      description?: string;
      color?: string;
      icon?: string;
    }) => api("/projects", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number } & Record<string, unknown>) =>
      api(`/projects/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

/* ---------- Tasks ---------- */

export interface TaskFilters {
  projectId?: number;
  status?: TaskStatus;
  assigneeId?: number;
}

export function useTasks(filters: TaskFilters = {}) {
  const qs = new URLSearchParams();
  if (filters.projectId) qs.set("projectId", String(filters.projectId));
  if (filters.status) qs.set("status", filters.status);
  if (filters.assigneeId) qs.set("assigneeId", String(filters.assigneeId));
  const suffix = qs.toString() ? `?${qs}` : "";
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => api<{ tasks: TaskListItem[] }>(`/tasks${suffix}`),
    select: (d) => d.tasks,
  });
}

export function useTask(id: number | null) {
  return useQuery({
    queryKey: ["task", id],
    queryFn: () => api<{ task: TaskDetail }>(`/tasks/${id}`),
    select: (d) => d.task,
    enabled: id !== null,
  });
}

export function useTaskTimeline(id: number | null) {
  return useQuery({
    queryKey: ["task-timeline", id],
    queryFn: () => api<{ events: ActivityItem[] }>(`/tasks/${id}/timeline`),
    select: (d) => d.events,
    enabled: id !== null,
  });
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  projectId: number;
  assigneeIds: number[];
  priority: TaskPriority;
  deadline?: string | null;
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      api<{ task: TaskDetail }>("/tasks", { method: "POST", body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number } & Record<string, unknown>) =>
      api(`/tasks/${id}`, { method: "PATCH", body: input }),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task", vars.id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useChangeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) =>
      api(`/tasks/${id}/status`, { method: "PATCH", body: { status } }),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task", vars.id] });
      qc.invalidateQueries({ queryKey: ["task-timeline", vars.id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useChangeProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, progress }: { id: number; progress: number }) =>
      api(`/tasks/${id}/progress`, { method: "PATCH", body: { progress } }),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task", vars.id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

/* ---------- Updates / Moderation ---------- */

export function useCreateUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, text }: { taskId: number; text: string }) =>
      api<{ update: UpdateItem }>(`/updates/for-task/${taskId}`, {
        method: "POST",
        body: { text },
      }),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ["my-updates"] });
      qc.invalidateQueries({ queryKey: ["task-timeline", vars.taskId] });
    },
  });
}

export function useModeration() {
  return useQuery({
    queryKey: ["moderation"],
    queryFn: () => api<{ updates: ModerationItem[] }>("/updates/moderation"),
    select: (d) => d.updates,
  });
}

export function useMyUpdates() {
  return useQuery({
    queryKey: ["my-updates"],
    queryFn: () => api<{ updates: MyUpdateItem[] }>("/updates/my"),
    select: (d) => d.updates,
  });
}

export function useApproveUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, progress }: { id: number; progress?: number }) =>
      api(`/updates/${id}/approve`, { method: "POST", body: { progress } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderation"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useRejectUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api(`/updates/${id}/reject`, { method: "POST", body: { reason } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["moderation"] }),
  });
}

/* ---------- Decisions ---------- */

export function useDecisions(status?: DecisionStatus) {
  const suffix = status ? `?status=${status}` : "";
  return useQuery({
    queryKey: ["decisions", status ?? "all"],
    queryFn: () =>
      api<{ requests: DecisionRequestDetail[] }>(`/decisions${suffix}`),
    select: (d) => d.requests,
  });
}

export function useDecision(id: number | null) {
  return useQuery({
    queryKey: ["decision", id],
    queryFn: () => api<{ request: DecisionRequestDetail }>(`/decisions/${id}`),
    select: (d) => d.request,
    enabled: id !== null,
  });
}

export interface CreateDecisionInput {
  taskId: number;
  title: string;
  description?: string;
  type: "choice" | "approval";
  options?: { title: string; description?: string }[];
}

export function useCreateDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDecisionInput) =>
      api<{ request: DecisionRequestDetail }>("/decisions", {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decisions"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDecide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number;
      optionId?: number;
      approved?: boolean;
      comment?: string;
    }) => api(`/decisions/${id}/decide`, { method: "POST", body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["decisions"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

/* ---------- Notifications ---------- */

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      api<{ notifications: AppNotification[]; unreadCount: number }>(
        "/notifications",
      ),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: number[]) =>
      api("/notifications/read", { method: "POST", body: { ids } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

/* ---------- Users ---------- */

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => api<{ users: User[] }>("/users"),
    select: (d) => d.users,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      email: string;
      password: string;
      role: string;
    }) => api("/users", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: number } & Record<string, unknown>) =>
      api(`/users/${id}`, { method: "PATCH", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      api(`/users/${id}/reset-password`, {
        method: "POST",
        body: { password },
      }),
  });
}
