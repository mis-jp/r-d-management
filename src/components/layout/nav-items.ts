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
import type { Role } from "@prisma/client";

export type NavItem = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean };

/** Employee personal workspace — claim and work assigned tasks. */
export const EMPLOYEE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/my-tasks", label: "My Tasks", icon: ListTodo },
  { href: "/board", label: "Task Board", icon: Columns3 },
  { href: "/open-tasks", label: "Open Tasks", icon: Hand },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

/**
 * Admin workspace — oversee and distribute work.
 * No "My Tasks": admins assign to employees, they are not assignees.
 */
export const ADMIN_WORKSPACE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/tasks", label: "All Tasks", icon: ClipboardList },
  { href: "/board", label: "Task Board", icon: Columns3 },
  { href: "/open-tasks", label: "Open Tasks", icon: Hand },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

export const ADMIN_MANAGEMENT_NAV: NavItem[] = [
  { href: "/team", label: "Team Workload", icon: Gauge, adminOnly: true },
  { href: "/employees", label: "Employees", icon: Users, adminOnly: true },
  { href: "/reports", label: "Reports & Analytics", icon: BarChart3, adminOnly: true },
  { href: "/activity", label: "Activity Log", icon: History, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];

/** @deprecated Prefer role-specific nav helpers. Kept for older imports. */
export const COMMON_NAV = EMPLOYEE_NAV;
/** @deprecated Prefer ADMIN_MANAGEMENT_NAV. */
export const ADMIN_NAV = ADMIN_MANAGEMENT_NAV;

export function workspaceNavFor(role: Role): NavItem[] {
  return role === "ADMIN" ? ADMIN_WORKSPACE_NAV : EMPLOYEE_NAV;
}

export function managementNavFor(role: Role): NavItem[] {
  return role === "ADMIN" ? ADMIN_MANAGEMENT_NAV : [];
}

const EXTRA_TITLES: Record<string, string> = {
  "/profile": "My Profile",
  "/tasks/new": "New Task",
  "/employees/new": "Add User",
};

export function titleForPath(pathname: string): string {
  if (EXTRA_TITLES[pathname]) return EXTRA_TITLES[pathname];
  const all = [...EMPLOYEE_NAV, ...ADMIN_WORKSPACE_NAV, ...ADMIN_MANAGEMENT_NAV].sort(
    (a, b) => b.href.length - a.href.length,
  );
  if (pathname.startsWith("/tasks/")) return "Task Details";
  if (pathname.startsWith("/employees/")) return "Employee Profile";
  return all.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`))?.label ?? "R&D Management";
}
