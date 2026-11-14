"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { CalendarRange } from "lucide-react";
import { RANGE_OPTIONS } from "@/lib/date-range";
import { Select } from "@/components/ui/form-controls";

/** Returns a setter that updates URL search params (and resets pagination). */
export function useSetParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setParams(updates: Record<string, string | null | undefined>, { resetPage = true } = {}) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === undefined || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (resetPage && !("page" in updates)) next.delete("page");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return { params, setParams, pending };
}

export function RangeSelect({ value }: { value: string }) {
  const { setParams, pending } = useSetParams();
  return (
    <div className="flex items-center gap-2">
      <CalendarRange className="size-4 text-slate-500" aria-hidden />
      <label htmlFor="range-select" className="sr-only">
        Date range
      </label>
      <Select
        id="range-select"
        value={value}
        onChange={(e) => setParams({ range: e.target.value })}
        className="h-8 w-40 text-xs"
        aria-busy={pending}
      >
        {RANGE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
