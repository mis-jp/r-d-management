import * as React from "react";
import { cn } from "@/lib/utils";

const controlBase =
  "w-full rounded-lg border bg-surface px-3 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 transition-colors focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25 disabled:cursor-not-allowed disabled:bg-slate-50 aria-invalid:border-red-400";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(controlBase, "h-9", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(controlBase, "min-h-24 py-2", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select className={cn(controlBase, "h-9 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium text-slate-700", className)} {...props} />;
}

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string[] | string;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** Label + control + hint/error, wired up for screen readers via `id` conventions. */
export function Field({ label, htmlFor, error, hint, required, className, children }: FieldProps) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="ml-0.5 text-red-500" aria-hidden>
            *
          </span>
        )}
      </Label>
      {children}
      {message ? (
        <p id={`${htmlFor}-error`} className="text-xs font-medium text-red-600" role="alert">
          {message}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormAlert({ message, tone = "error" }: { message?: string | null; tone?: "error" | "success" }) {
  if (!message) return null;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700",
      )}
    >
      {message}
    </div>
  );
}
