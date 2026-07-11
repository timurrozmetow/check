import {
  CheckSquare,
  FileText,
  FolderKanban,
  Gavel,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppShell, type NavItem } from "./AppShell";
import { useDecisions, useModeration } from "@/api/hooks";

export function AdminLayout() {
  const { t } = useTranslation();
  const { data: moderation } = useModeration();
  const { data: decisions } = useDecisions("pending");

  const items: NavItem[] = [
    { to: "/admin", label: t("adminLayout.overview"), icon: LayoutDashboard },
    { to: "/admin/projects", label: t("adminLayout.projects"), icon: FolderKanban },
    { to: "/admin/tasks", label: t("adminLayout.tasks"), icon: CheckSquare },
    {
      to: "/admin/moderation",
      label: t("adminLayout.moderation"),
      icon: ShieldCheck,
      badge: moderation?.length ?? 0,
    },
    {
      to: "/admin/decisions",
      label: t("adminLayout.decisions"),
      icon: Gavel,
      badge: decisions?.length ?? 0,
    },
    { to: "/admin/users", label: t("adminLayout.users"), icon: Users },
    { to: "/admin/reports", label: t("adminLayout.reports"), icon: FileText },
  ];

  return <AppShell items={items} title={t("adminLayout.title")} />;
}
