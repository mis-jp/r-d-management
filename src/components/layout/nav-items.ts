import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardList,
  Columns3,
  Gauge,
  Hand,
  History,
  LayoutDashboard,
  ListTodo,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean };

export const COMMON_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/my-tasks", label: "My Tasks", icon: ListTodo },
  { href: "/board", label: "Task Board", icon: Columns3 },
  { href: "/open-tasks", label: "OPEN Tasks", icon: Hand },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/tasks", label: "All Tasks", icon: ClipboardList, adminOnly: true },
  { href: "/team", label: "Team Workload", icon: Gauge, adminOnly: true },
  { href: "/employees", label: "Employees", icon: Users, adminOnly: true },
  { href: "/reports", label: "Reports & Analytics", icon: BarChart3, adminOnly: true },
  { href: "/activity", label: "Activity Log", icon: History, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];

const EXTRA_TITLES: Record<string, string> = {
  "/profile": "My Profile",
  "/tasks/new": "New Task",
  "/employees/new": "Add User",
};

export function titleForPath(pathname: string): string {
  if (EXTRA_TITLES[pathname]) return EXTRA_TITLES[pathname];
  const all = [...COMMON_NAV, ...ADMIN_NAV].sort((a, b) => b.href.length - a.href.length);
  if (pathname.startsWith("/tasks/")) return "Task Details";
  if (pathname.startsWith("/employees/")) return "Employee Profile";
  return all.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))?.label ?? "R&D Management";
}
