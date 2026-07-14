import { CalendarDays, Gavel, LayoutDashboard } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppShell, type NavItem } from "./AppShell";
import { useDecisions } from "@/api/hooks";

export function DirectorLayout() {
  const { t } = useTranslation();
  const { data: decisions } = useDecisions("pending");

  const items: NavItem[] = [
    { to: "/director", label: t("directorLayout.dashboard"), icon: LayoutDashboard },
    {
      to: "/director/calendar",
      label: t("directorLayout.calendar"),
      icon: CalendarDays,
    },
    {
      to: "/director/decisions",
      label: t("directorLayout.pendingDecisions"),
      icon: Gavel,
      badge: decisions?.length ?? 0,
    },
  ];

  return <AppShell items={items} title={t("directorLayout.title")} />;
}
