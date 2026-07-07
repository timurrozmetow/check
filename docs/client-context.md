# Контекст клиента DirectorHub (для реализации страниц)

Проект: `C:/Users/User/Desktop/check-out/client`. React 18 + TS strict + Vite + Tailwind + shadcn/ui + TanStack Query + framer-motion. Alias `@/` → `src/`. Язык UI — только русский. Женственный, чистый офисный дизайн: индиго-акцент, шрифт Golos Text, мягкие тени (класс `shadow-card`), скругления `rounded-2xl`.

## Готовые UI-компоненты (`@/components/ui/*`)
button (варианты default/destructive/outline/secondary/ghost/link; размеры sm/default/lg/icon), card (Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription), input, label, textarea, badge (варианты default/secondary/destructive/outline/success/warning), avatar (Avatar, AvatarFallback), dialog (Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription), dropdown-menu (DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel), select (Select, SelectTrigger, SelectValue, SelectContent, SelectItem), tabs (Tabs, TabsList, TabsTrigger, TabsContent), skeleton (Skeleton), separator (Separator), switch (Switch), checkbox (Checkbox), popover (Popover, PopoverTrigger, PopoverContent), tooltip (Tooltip, TooltipTrigger, TooltipContent, TooltipProvider), sheet (Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle). Все именованные экспорты.

## Готовые общие компоненты (`@/components/common/*`)
- `Logo`, `ThemeToggle`, `LoadingScreen`
- `ProgressBar` — `{ value, showLabel?, size?: "sm"|"md"|"lg", className? }` анимированный градиентный прогресс.
- `StatusBadge` (`{status}`), `PriorityBadge` (`{priority}`), `UpdateStatusBadge` (`{status}`) — из `@/components/common/StatusBadge`.
- `KpiCard` — `{ label, value:number, icon:LucideIcon, variant?: "default"|"accent"|"danger"|"success", onClick?, index? }` с count-up.
- `EmptyState` — `{ icon:LucideIcon, title, description?, action?:ReactNode }`.
- `ProjectChip` — `{ name, color, className? }`.
- `DonutProgress` — `{ value, size?, stroke?, color? }`.
- `CountUp` — `{ value, duration? }`.

## Готовые фичи
- `@/features/tasks/TaskCard` — `{ task: TaskListItem, basePath: string, index? }`.
- `@/features/tasks/FileGrid` — `{ files: FileInfo[] }` (лайтбокс + документы).
- `@/features/tasks/Timeline` — `{ events: ActivityItem[] }`.
- `@/features/tasks/AdminTaskControls` — `{ task: TaskDetail }`.
- `@/features/decisions/DecisionCard` — `{ request: DecisionRequestDetail, index? }` (кнопки решения активны только для директора; для решённых показывает итог — можно переиспользовать для просмотра админом).
- `@/features/decisions/CreateDecisionDialog` — `{ taskId:number, trigger:ReactNode }`.
- `@/features/updates/UpdateForm` — `{ taskId:number }`.

## API-хуки (`@/api/hooks`)
Проекты: `useProjects()` → ProjectWithStats[]; `useCreateProject()`, `useUpdateProject()`, `useDeleteProject()` (mutate({id,...})).
Задачи: `useTasks(filters?: {projectId?,status?,assigneeId?})` → TaskListItem[]; `useTask(id|null)`, `useTaskTimeline(id|null)`; `useCreateTask()` (mutateAsync(CreateTaskInput)), `useUpdateTask()`, `useChangeStatus()`, `useChangeProgress()`, `useDeleteTask()`.
CreateTaskInput = { title, description?, projectId, assigneeIds:number[], priority, deadline?:string|null }.
Обновления: `useModeration()`, `useMyUpdates()`, `useCreateUpdate()`, `useApproveUpdate()`, `useRejectUpdate()`.
Решения: `useDecisions(status?: "pending"|"decided")`, `useDecision(id)`, `useCreateDecision()`, `useDecide()`.
Уведомления: `useNotifications()`, `useMarkRead()`.
Пользователи: `useUsers()` → User[]; `useCreateUser()` (mutate({name,email,password,role})), `useUpdateUser()` (mutate({id,...})), `useResetPassword()` (mutate({id,password})).
Мутации возвращают объект react-query: `mutate`, `mutateAsync`, `isPending`. Инвалидация кэша уже настроена внутри хуков.

## Прочее
- Типы DTO: `@/api/types` (User, ProjectWithStats, TaskListItem, TaskDetail, DecisionRequestDetail, ...).
- Скачивание файла: `apiDownload(path, filename)` из `@/api/client` (для .docx-отчёта).
- Форматирование: `@/lib/format` — formatDate, formatDateTime, formatRelative, isOverdue, initials. `formatFileSize`, `cn` — из `@/lib/utils`.
- Константы: `@/lib/constants` — ACTIVE_STATUSES, ALL_STATUSES, ALL_PRIORITIES, PROJECT_COLORS.
- Подписи: `@/lib/labels` — ROLE_LABELS, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, PROJECT_STATUS_LABELS, ...(Record по коду → русская строка).
- Тосты: `import { toast } from "sonner"` (toast.success / toast.error). Ошибки API — `RequestError` из `@/api/client` (`.message` уже на русском).
- Анимации: framer-motion, длительность 0.3–0.4s, ease [0.22,0.7,0.3,1], stagger по index.
- Текущий пользователь: `useAuthStore((s)=>s.user)` из `@/stores/auth`.
- Все страницы — именованный экспорт с именем файла (напр. `export function AdminProjects()`), оборачиваются в `<main>` из layout, поэтому просто верни контент (используй `mx-auto max-w-6xl space-y-...`).
