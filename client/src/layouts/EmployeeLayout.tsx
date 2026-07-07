import { CheckSquare, Send } from "lucide-react";
import { AppShell, type NavItem } from "./AppShell";

export function EmployeeLayout() {
  const items: NavItem[] = [
    { to: "/employee", label: "Мои задачи", icon: CheckSquare },
    { to: "/employee/updates", label: "Мои обновления", icon: Send },
  ];

  return <AppShell items={items} title="Мои задачи" />;
}
