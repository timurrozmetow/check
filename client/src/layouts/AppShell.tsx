import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { logout } from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { ROLE_LABELS } from "@/lib/labels";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Счётчик-бейдж (модерация, решения). */
  badge?: number;
}

function NavList({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )
          }
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" />
          <span className="flex-1">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
              {item.badge}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function UserCard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <div className="mt-auto border-t border-border p-3">
      <div className="flex items-center gap-3 rounded-[10px] px-2 py-2">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="text-xs text-muted-foreground">
            {ROLE_LABELS[user.role]}
          </p>
        </div>
        <button
          type="button"
          aria-label="Выйти"
          onClick={async () => {
            await logout();
            navigate("/login", { replace: true });
          }}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
        >
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
}

/** Каркас приложения: адаптивный сайдбар + шапка. */
export function AppShell({
  items,
  title,
}: {
  items: NavItem[];
  title: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Десктоп-сайдбар */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto py-2 thin-scrollbar">
          <NavList items={items} />
        </div>
        <UserCard />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Шапка */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur md:px-6">
          {/* Мобильное меню */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="flex h-16 items-center px-5">
                <Logo />
              </div>
              <div className="py-2">
                <NavList items={items} onNavigate={() => setMobileOpen(false)} />
              </div>
              <UserCard />
            </SheetContent>
          </Sheet>

          <h1 className="text-lg font-bold tracking-tight">{title}</h1>
          <div className="flex-1" />
          <ThemeToggle />
          <NotificationBell />
        </header>

        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
