import { Gavel, LayoutDashboard } from "lucide-react";
import { AppShell, type NavItem } from "./AppShell";
import { useDecisions } from "@/api/hooks";

export function DirectorLayout() {
  const { data: decisions } = useDecisions("pending");

  const items: NavItem[] = [
    { to: "/director", label: "Дашборд", icon: LayoutDashboard },
    {
      to: "/director/decisions",
      label: "Ждут решения",
      icon: Gavel,
      badge: decisions?.length ?? 0,
    },
  ];

  return <AppShell items={items} title="Кабинет директора" />;
}
