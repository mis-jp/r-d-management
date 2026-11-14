import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  basePath: string;
  params: Record<string, string | string[] | undefined>;
};

function hrefFor(basePath: string, params: Props["params"], page: number) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    const value = Array.isArray(v) ? v[0] : v;
    if (value && k !== "page") qs.set(k, value);
  }
  if (page > 1) qs.set("page", String(page));
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}

export function Pagination({ page, pageCount, total, pageSize, basePath, params }: Props) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const linkCls = "inline-flex h-8 items-center gap-1 rounded-lg border bg-surface px-3 text-xs font-medium hover:bg-slate-50";
  const disabledCls = "pointer-events-none opacity-40";
  return (
    <nav className="flex items-center justify-between gap-3 border-t px-4 py-3 text-xs text-slate-500" aria-label="Pagination">
      <p>
        Showing <span className="font-medium text-slate-700">{from}</span>–<span className="font-medium text-slate-700">{to}</span> of{" "}
        <span className="font-medium text-slate-700">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={hrefFor(basePath, params, page - 1)}
          className={cn(linkCls, page <= 1 && disabledCls)}
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
        >
          <ChevronLeft className="size-3.5" /> Previous
        </Link>
        <span>
          Page {page} of {pageCount}
        </span>
        <Link
          href={hrefFor(basePath, params, page + 1)}
          className={cn(linkCls, page >= pageCount && disabledCls)}
          aria-disabled={page >= pageCount}
          tabIndex={page >= pageCount ? -1 : undefined}
        >
          Next <ChevronRight className="size-3.5" />
        </Link>
      </div>
    </nav>
  );
}
