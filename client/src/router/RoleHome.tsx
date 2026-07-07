import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { roleHome } from "./role-home";

/** Редирект с корня на домашнюю страницу текущей роли (или логин). */
export function RoleHome() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={roleHome(user.role)} replace />;
}
