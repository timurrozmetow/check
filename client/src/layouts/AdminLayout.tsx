import {
  CheckSquare,
  FileText,
  FolderKanban,
  Gavel,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AppShell, type NavItem } from "./AppShell";
import { useDecisions, useModeration } from "@/api/hooks";

export function AdminLayout() {
  const { data: moderation } = useModeration();
  const { data: decisions } = useDecisions("pending");

  const items: NavItem[] = [
    { to: "/admin", label: "Обзор", icon: LayoutDashboard },
    { to: "/admin/projects", label: "Проекты", icon: FolderKanban },
    { to: "/admin/tasks", label: "Задачи", icon: CheckSquare },
    {
      to: "/admin/moderation",
      label: "Модерация",
      icon: ShieldCheck,
      badge: moderation?.length ?? 0,
    },
    {
      to: "/admin/decisions",
      label: "Решения",
      icon: Gavel,
      badge: decisions?.length ?? 0,
    },
    { to: "/admin/users", label: "Пользователи", icon: Users },
    { to: "/admin/reports", label: "Отчёты", icon: FileText },
  ];

  return <AppShell items={items} title="Панель администратора" />;
}
