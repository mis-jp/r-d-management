import { z } from "zod";

/** Empty form strings become `undefined` so optional fields validate cleanly. */
export const optionalString = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : typeof v === "string" ? v.trim() : v),
    z.string().max(max, `Must be ${max} characters or fewer.`).optional(),
  );

/**
 * Calendar date from `<input type="date">`, stored at 12:00 UTC so it renders as the
 * same calendar day in every timezone between UTC-11 and UTC+11.
 */
export const optionalDate = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
    .transform((s) => new Date(`${s}T12:00:00.000Z`))
    .refine((d) => !Number.isNaN(d.getTime()), "Enter a valid date.")
    .optional(),
);

/** Hours (decimals allowed) converted to whole minutes. */
export const optionalHoursAsMinutes = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.coerce
    .number({ error: "Enter a number of hours." })
    .min(0, "Must be zero or more.")
    .max(10000, "That is too large.")
    .transform((h) => Math.round(h * 60))
    .optional(),
);

export const idSchema = z.string().min(1).max(191);

export function formToObject(formData: FormData): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
  const out: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const key of new Set(formData.keys())) {
    const all = formData.getAll(key);
    out[key] = key.endsWith("[]") ? all : all[0]!;
  }
  return out;
}
