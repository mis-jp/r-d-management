"use client";

import { Toaster } from "sonner";
import { useTheme } from "./use-theme";

export function ThemeToaster() {
  const { resolved } = useTheme();
  return <Toaster position="top-right" richColors closeButton theme={resolved} />;
}
