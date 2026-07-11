import { CheckSquare, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppShell, type NavItem } from "./AppShell";

export function EmployeeLayout() {
  const { t } = useTranslation();

  const items: NavItem[] = [
    { to: "/employee", label: t("employeeLayout.myTasks"), icon: CheckSquare },
    { to: "/employee/updates", label: t("employeeLayout.myUpdates"), icon: Send },
  ];

  return <AppShell items={items} title={t("employeeLayout.myTasks")} />;
}
