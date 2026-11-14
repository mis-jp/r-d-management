"use client";

import { useActionState, useTransition, type FormEvent } from "react";
import type { FormState } from "@/lib/action-result";

type FormAction<T> = (prev: FormState<T>, formData: FormData) => Promise<FormState<T>>;

/**
 * Submits a form through `useActionState` without React's automatic form reset,
 * so users keep what they typed when server validation fails.
 */
export function useFormAction<T = undefined>(action: FormAction<T>) {
  const [state, dispatch, pending] = useActionState(action, null);
  const [, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return { state, onSubmit, pending };
}
