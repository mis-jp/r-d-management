import { z } from "zod";
import { AppError } from "./errors";

export type FieldErrors = Record<string, string[] | undefined>;

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

/** Initial state for `useActionState` forms. */
export type FormState<T = undefined> = ActionResult<T> | null;

export function fromZodError(error: z.ZodError): ActionResult<never> {
  return {
    ok: false,
    error: "Please fix the highlighted fields.",
    fieldErrors: z.flattenError(error).fieldErrors as FieldErrors,
  };
}

/** Converts thrown errors into a safe result; unexpected errors never leak details to the client. */
export function toActionError(error: unknown): ActionResult<never> {
  if (error instanceof AppError) return { ok: false, error: error.message };
  console.error(error);
  return { ok: false, error: "Something went wrong. Please try again." };
}
