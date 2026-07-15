import { lazy, useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { tryRefresh } from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { NotificationsProvider } from "@/features/notifications/NotificationsProvider";
import { ProtectedRoute } from "@/router/ProtectedRoute";
import { RoleHome } from "@/router/RoleHome";
import { AdminLayout } from "@/layouts/AdminLayout";
import { DirectorLayout } from "@/layouts/DirectorLayout";
import { EmployeeLayout } from "@/layouts/EmployeeLayout";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { LoadingScreen } from "@/components/common/LoadingScreen";

// Страницы грузим лениво (route-split): при входе не тянем весь код админа,
// директора и сотрудника одним чанком. Все они рендерятся под AppShell, где
// добавлен Suspense — сайдбар остаётся на месте, пока подгружается чанк страницы.
const AdminDashboard = lazy(() =>
  import("@/pages/admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard })),
);
const AdminProjects = lazy(() =>
  import("@/pages/admin/AdminProjects").then((m) => ({ default: m.AdminProjects })),
);
const AdminTasks = lazy(() =>
  import("@/pages/admin/AdminTasks").then((m) => ({ default: m.AdminTasks })),
);
const AdminModeration = lazy(() =>
  import("@/pages/admin/AdminModeration").then((m) => ({ default: m.AdminModeration })),
);
const AdminDecisions = lazy(() =>
  import("@/pages/admin/AdminDecisions").then((m) => ({ default: m.AdminDecisions })),
);
const AdminUsers = lazy(() =>
  import("@/pages/admin/AdminUsers").then((m) => ({ default: m.AdminUsers })),
);
const AdminReports = lazy(() =>
  import("@/pages/admin/AdminReports").then((m) => ({ default: m.AdminReports })),
);
const BoardPage = lazy(() =>
  import("@/pages/admin/BoardPage").then((m) => ({ default: m.BoardPage })),
);
const DirectorDashboard = lazy(() =>
  import("@/pages/director/DirectorDashboard").then((m) => ({
    default: m.DirectorDashboard,
  })),
);
const DirectorDecisions = lazy(() =>
  import("@/pages/director/DirectorDecisions").then((m) => ({
    default: m.DirectorDecisions,
  })),
);
const EmployeeTasks = lazy(() =>
  import("@/pages/employee/EmployeeTasks").then((m) => ({ default: m.EmployeeTasks })),
);
const EmployeeUpdates = lazy(() =>
  import("@/pages/employee/EmployeeUpdates").then((m) => ({
    default: m.EmployeeUpdates,
  })),
);
const TaskPage = lazy(() =>
  import("@/pages/TaskPage").then((m) => ({ default: m.TaskPage })),
);
const CalendarPage = lazy(() =>
  import("@/pages/CalendarPage").then((m) => ({ default: m.CalendarPage })),
);

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
          <Route path="/admin/board" element={<BoardPage />} />
          <Route path="/admin/calendar" element={<CalendarPage />} />
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
          <Route path="/director/calendar" element={<CalendarPage />} />
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
        {/* Неизвестный маршрут — страница 404 с анимацией */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </NotificationsProvider>
  );
}
