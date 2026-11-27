"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./form-controls";

type Props = Omit<React.ComponentProps<"input">, "type"> & {
  /** When true, starts with the password visible. Default is hidden. */
  defaultVisible?: boolean;
};

/** Password field with a show/hide toggle for the eye icon. */
export function PasswordInput({ className, defaultVisible = false, id, ...props }: Props) {
  const [visible, setVisible] = useState(defaultVisible);
  const toggleId = id ? `${id}-visibility` : undefined;

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        className={cn("pr-11", className)}
        {...props}
      />
      <button
        type="button"
        id={toggleId}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-1 top-1/2 z-10 -translate-y-1/2 inline-flex size-8 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        suppressHydrationWarning
      >
        {visible ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
      </button>
    </div>
  );
}
