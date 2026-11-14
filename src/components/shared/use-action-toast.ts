"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { FormState } from "@/lib/action-result";

/** Shows a toast whenever a `useActionState` result changes; `onSuccess` runs once per success. */
export function useActionToast(state: FormState<unknown>, onSuccess?: () => void) {
  const last = useRef<FormState<unknown>>(null);
  useEffect(() => {
    if (!state || state === last.current) return;
    last.current = state;
    if (state.ok) {
      if (state.message) toast.success(state.message);
      onSuccess?.();
    } else if (!state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, onSuccess]);
}

export function fieldError(state: FormState<unknown>, name: string): string[] | undefined {
  return state && !state.ok ? state.fieldErrors?.[name] : undefined;
}
