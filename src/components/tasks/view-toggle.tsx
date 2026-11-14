import Link from "next/link";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string; icon?: React.ReactNode };

/** Link-based segmented control that preserves other URL params. */
export function ParamToggle({
  name,
  value,
  options,
  basePath,
  params,
  label,
}: {
  name: string;
  value: string;
  options: Option[];
  basePath: string;
  params: Record<string, string | string[] | undefined>;
  label: string;
}) {
  function href(v: string) {
    const qs = new URLSearchParams();
    for (const [k, raw] of Object.entries(params)) {
      const val = Array.isArray(raw) ? raw[0] : raw;
      if (val && k !== name && k !== "page") qs.set(k, val);
    }
    if (v !== options[0]!.value) qs.set(name, v);
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  }
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg border bg-surface p-0.5">
      {options.map((o) => (
        <Link
          key={o.value}
          href={href(o.value)}
          aria-current={o.value === value ? "true" : undefined}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium [&_svg]:size-3.5",
            o.value === value ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:text-slate-900",
          )}
        >
          {o.icon}
          {o.label}
        </Link>
      ))}
    </div>
  );
}
