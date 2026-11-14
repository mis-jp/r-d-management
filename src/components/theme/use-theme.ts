"use client";

import { useSyncExternalStore } from "react";
import { DARK_MEDIA_QUERY as DARK_QUERY, THEME_STORAGE_KEY as STORAGE_KEY } from "./theme-script";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const CHANGE_EVENT = "themechange";

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function readResolved(): ResolvedTheme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function applyTheme(preference: ThemePreference) {
  const dark = preference === "dark" || (preference === "system" && window.matchMedia(DARK_QUERY).matches);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export function setThemePreference(preference: ThemePreference) {
  try {
    if (preference === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Storage can be unavailable (private mode); the theme still applies for this page.
  }
  applyTheme(preference);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  const onSystemChange = () => {
    if (readPreference() === "system") applyTheme("system");
    onChange();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    applyTheme(readPreference());
    onChange();
  };
  media.addEventListener("change", onSystemChange);
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function useTheme() {
  const preference = useSyncExternalStore<ThemePreference>(subscribe, readPreference, () => "system");
  const resolved = useSyncExternalStore<ResolvedTheme>(subscribe, readResolved, () => "light");
  return { preference, resolved, setPreference: setThemePreference };
}
