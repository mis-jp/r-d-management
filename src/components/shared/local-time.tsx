"use client";

import { useSyncExternalStore } from "react";
import { formatDateTime, formatRelative } from "@/lib/utils";

const subscribe = () => () => {};

/** Renders a timestamp in the viewer's local timezone (server render falls back to UTC-based text). */
export function LocalTime({ value, relative = false }: { value: Date | string; relative?: boolean }) {
  const iso = typeof value === "string" ? value : value.toISOString();
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const text = relative ? formatRelative(iso) : formatDateTime(iso);
  return (
    <time dateTime={iso} title={isClient ? formatDateTime(iso) : undefined} suppressHydrationWarning>
      {text}
    </time>
  );
}
