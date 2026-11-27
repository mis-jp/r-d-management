"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { NotificationType, Role } from "@prisma/client";
import {
  Bell,
  CheckCheck,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import { logoutAction } from "@/server/actions/auth-actions";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/server/actions/notification-actions";
import { BrandLogo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/misc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LocalTime } from "@/components/shared/local-time";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { GlobalSearch } from "./global-search";
import { managementNavFor, titleForPath, workspaceNavFor, type NavItem } from "./nav-items";

export type ShellUser = { id: string; name: string; email: string; role: Role; avatarColor: string | null; jobTitle: string | null };
export type ShellNotification = {
  id: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  createdAt: string;
  taskKey: string | null;
};

type Props = {
  user: ShellUser;
  unread: number;
  notifications: ShellNotification[];
  initialCollapsed: boolean;
  children: React.ReactNode;
};

export function AppShell({ user, unread, notifications, initialCollapsed, children }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `sidebar=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-slate-200/80 bg-surface transition-[width] duration-200 lg:flex",
          collapsed ? "w-[72px]" : "w-64",
        )}
        aria-label="Main navigation"
      >
        <SidebarContent role={user.role} pathname={pathname} collapsed={collapsed} />
        <div className="mt-auto border-t border-slate-200/80 p-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900",
              collapsed && "justify-center px-0",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-slate-950/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-[18.5rem] max-w-[85vw] flex-col bg-surface shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 z-10 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close navigation"
            >
              <X className="size-4" />
            </button>
            <SidebarContent role={user.role} pathname={pathname} collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-surface/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
            <ol className="flex items-center gap-1.5 text-sm">
              <li className="hidden text-slate-400 sm:block">R&amp;D</li>
              <li className="hidden text-slate-300 sm:block" aria-hidden>
                /
              </li>
              <li className="truncate font-medium text-slate-900">{titleForPath(pathname)}</li>
            </ol>
          </nav>
          <GlobalSearch role={user.role} />
          <ThemeToggle />
          <NotificationMenu unread={unread} notifications={notifications} />
          <UserMenu user={user} />
        </header>
        <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  role,
  pathname,
  collapsed,
  onNavigate,
}: {
  role: Role;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-slate-200/80",
          collapsed ? "h-16 justify-center px-3" : "h-[4.25rem] px-4 pr-12 lg:pr-4",
        )}
      >
        {collapsed ? (
          <BrandLogo mark className="size-9" />
        ) : (
          <BrandLogo className="h-10 w-auto max-w-[13.5rem] object-contain object-left" />
        )}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        <div className="space-y-5">
          <NavSection
            title="Workspace"
            items={workspaceNavFor(role)}
            pathname={pathname}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
          {role === "ADMIN" && (
            <NavSection
              title="Management"
              items={managementNavFor(role)}
              pathname={pathname}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          )}
        </div>
      </nav>
    </>
  );
}

function NavSection({
  title,
  items,
  pathname,
  collapsed,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div>
      {!collapsed && (
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</p>
      )}
      <ul className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group flex items-center rounded-xl text-sm font-medium transition-colors",
                  collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
                  active
                    ? "bg-brand-50 text-brand-700 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.12)]"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                    active ? "bg-brand-100/80 text-brand-700" : "text-slate-400 group-hover:text-slate-600",
                  )}
                >
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                {collapsed ? (
                  <span className="sr-only">{item.label}</span>
                ) : (
                  <span className="min-w-0 flex-1 truncate leading-none">{item.label}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NotificationMenu({ unread, notifications }: { unread: number; notifications: ShellNotification[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function open(n: ShellNotification) {
    startTransition(async () => {
      if (!n.isRead) await markNotificationReadAction(n.id);
      router.push(n.taskKey ? `/tasks/${n.taskKey}` : "/notifications");
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-4 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await markAllNotificationsReadAction();
                  if (res.ok) toast.success("All caught up.");
                })
              }
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto p-1">
          {notifications.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">You&apos;re all caught up.</p>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem key={n.id} onSelect={() => open(n)} className="items-start py-2">
                <span
                  className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.isRead ? "bg-transparent" : "bg-brand-500")}
                  aria-label={n.isRead ? undefined : "Unread"}
                />
                <span className="min-w-0">
                  <span className={cn("block text-sm leading-snug", n.isRead ? "text-slate-600" : "font-medium text-slate-900")}>
                    {n.message}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    <LocalTime value={n.createdAt} relative />
                  </span>
                </span>
              </DropdownMenuItem>
            ))
          )}
        </div>
        <div className="border-t p-1">
          <DropdownMenuItem onSelect={() => router.push("/notifications")} className="justify-center text-brand-600">
            View all notifications
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu({ user }: { user: ShellUser }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100" aria-label="Account menu">
        <Avatar name={user.name} color={user.avatarColor} size="md" />
        <span className="hidden text-left leading-tight xl:block">
          <span className="block text-sm font-medium text-slate-900">{user.name}</span>
          <span className="block text-xs text-slate-500">{ROLE_LABELS[user.role]}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-semibold text-slate-900">{user.name}</span>
          <span className="block truncate font-normal">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/profile")}>
          <UserRound /> My profile
        </DropdownMenuItem>
        {user.role === "ADMIN" && (
          <DropdownMenuItem onSelect={() => router.push("/settings")}>
            <Settings /> Settings
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logoutAction()} className="text-red-600 [&_svg]:text-red-500">
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
