import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { tryRefresh } from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { NotificationsProvider } from "@/features/notifications/NotificationsProvider";
import { ProtectedRoute } from "@/router/ProtectedRoute";
import { RoleHome } from "@/router/RoleHome";
import { AdminLayout } from "@/layouts/AdminLayout";
import { DirectorLayout } from "@/layouts/DirectorLayout";
import { EmployeeLayout } from "@/layouts/EmployeeLayout";
import { LoginPage } from "@/pages/LoginPage";
import { LoadingScreen } from "@/components/common/LoadingScreen";

// Admin
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AdminProjects } from "@/pages/admin/AdminProjects";
import { AdminTasks } from "@/pages/admin/AdminTasks";
import { AdminModeration } from "@/pages/admin/AdminModeration";
import { AdminDecisions } from "@/pages/admin/AdminDecisions";
import { AdminUsers } from "@/pages/admin/AdminUsers";
import { AdminReports } from "@/pages/admin/AdminReports";
// Director
import { DirectorDashboard } from "@/pages/director/DirectorDashboard";
import { DirectorDecisions } from "@/pages/director/DirectorDecisions";
// Employee
import { EmployeeTasks } from "@/pages/employee/EmployeeTasks";
import { EmployeeUpdates } from "@/pages/employee/EmployeeUpdates";
// Общая карточка задачи
import { TaskPage } from "@/pages/TaskPage";

export default function App() {
  const initializing = useAuthStore((s) => s.initializing);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    // Первичная попытка восстановить сессию по refresh-cookie
    tryRefresh().finally(() => setInitialized());
  }, [setInitialized]);

  if (initializing) return <LoadingScreen />;

  return (
    <NotificationsProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Админ */}
        <Route
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/projects" element={<AdminProjects />} />
          <Route path="/admin/tasks" element={<AdminTasks />} />
          <Route path="/admin/moderation" element={<AdminModeration />} />
          <Route path="/admin/decisions" element={<AdminDecisions />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/tasks/:id" element={<TaskPage />} />
        </Route>

        {/* Директор */}
        <Route
          element={
            <ProtectedRoute roles={["director"]}>
              <DirectorLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/director" element={<DirectorDashboard />} />
          <Route path="/director/decisions" element={<DirectorDecisions />} />
          <Route path="/director/tasks/:id" element={<TaskPage />} />
        </Route>

        {/* Сотрудник */}
        <Route
          element={
            <ProtectedRoute roles={["employee"]}>
              <EmployeeLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/employee" element={<EmployeeTasks />} />
          <Route path="/employee/updates" element={<EmployeeUpdates />} />
          <Route path="/employee/tasks/:id" element={<TaskPage />} />
        </Route>

        {/* Корень — редирект по роли */}
        <Route path="/" element={<RoleHome />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </NotificationsProvider>
  );
}
