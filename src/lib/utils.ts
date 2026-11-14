import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNowStrict, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type DateInput = Date | string | number | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return isValid(d) ? d : null;
}

export function formatDate(value: DateInput, pattern = "MMM d, yyyy"): string {
  const d = toDate(value);
  return d ? format(d, pattern) : "—";
}

export function formatDateTime(value: DateInput): string {
  return formatDate(value, "MMM d, yyyy · h:mm a");
}

export function formatRelative(value: DateInput): string {
  const d = toDate(value);
  return d ? `${formatDistanceToNowStrict(d)} ago` : "—";
}

/** `yyyy-MM-dd` for `<input type="date">` values. */
export function toDateInputValue(value: DateInput): string {
  const d = toDate(value);
  return d ? format(d, "yyyy-MM-dd") : "";
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const HONORIFICS = new Set(["dr", "mr", "mrs", "ms", "miss", "prof", "engr", "atty"]);

function nameParts(name: string): string[] {
  const parts = name.split(/\s+/).filter(Boolean);
  const withoutTitles = parts.filter((part) => !HONORIFICS.has(part.replace(/\.$/, "").toLowerCase()));
  return withoutTitles.length > 0 ? withoutTitles : parts;
}

export function firstName(name: string): string {
  return nameParts(name)[0] ?? name;
}

export function initials(name: string): string {
  return nameParts(name)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function percent(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
