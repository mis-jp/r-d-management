"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { PRIORITIES, PRIORITY_LABELS, STATUS_LABELS, TASK_STATUSES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-controls";
import { useSetParams } from "@/components/shared/url-controls";
import { cn } from "@/lib/utils";

type Option = { id: string; name: string };

type Props = {
  tags: Option[];
  assignees?: Option[];
  showStatus?: boolean;
  showArchived?: boolean;
  showCreatedRange?: boolean;
  sortOptions?: { value: string; label: string }[];
};

const DEFAULT_SORTS = [
  { value: "updated", label: "Recently updated" },
  { value: "created", label: "Recently created" },
  { value: "due", label: "Due date" },
  { value: "priority", label: "Priority" },
  { value: "progress", label: "Progress" },
  { value: "key", label: "Task key" },
];

const FILTER_KEYS = ["q", "status", "priority", "assignee", "tag", "due", "archived", "sort", "dir", "createdFrom", "createdTo"];
const ADVANCED_KEYS = ["assignee", "tag", "due", "archived", "sort", "dir", "createdFrom", "createdTo"];

export function TaskFilters({
  tags,
  assignees,
  showStatus = true,
  showArchived = false,
  showCreatedRange = false,
  sortOptions = DEFAULT_SORTS,
}: Props) {
  const { params, setParams, pending } = useSetParams();
  const urlQuery = params.get("q") ?? "";
  const [q, setQ] = useState(urlQuery);
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  const advancedActive = ADVANCED_KEYS.some((k) => params.get(k));
  const [showAdvanced, setShowAdvanced] = useState(advancedActive);

  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery);
    setQ(urlQuery);
  }

  useEffect(() => {
    if (q === urlQuery) return;
    const id = setTimeout(() => setParams({ q: q.trim() || null }), 350);
    return () => clearTimeout(id);
  }, [q, urlQuery, setParams]);

  const active = FILTER_KEYS.some((k) => params.get(k));
  const value = (k: string) => params.get(k) ?? "";

  return (
    <div className="flex flex-col gap-3 border-b bg-surface/80 p-4" aria-busy={pending}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <label htmlFor="task-search" className="sr-only">
            Search by key, title or tag
          </label>
          <Input
            id="task-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by key, title, tag…"
            className="pl-8"
          />
        </div>
        {showStatus && (
          <FilterSelect label="Status" value={value("status")} onChange={(v) => setParams({ status: v })}>
            <option value="">All statuses</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </FilterSelect>
        )}
        <FilterSelect label="Priority" value={value("priority")} onChange={(v) => setParams({ priority: v })}>
          <option value="">All priorities</option>
          {[...PRIORITIES].reverse().map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </FilterSelect>
        <Button
          type="button"
          variant={showAdvanced || advancedActive ? "secondary" : "outline"}
          size="sm"
          className="h-9"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
        >
          <SlidersHorizontal />
          More filters
          {advancedActive && (
            <span className="rounded-full bg-brand-100 px-1.5 text-[10px] font-semibold text-brand-700">on</span>
          )}
          <ChevronDown className={cn("size-3.5 transition-transform", showAdvanced && "rotate-180")} />
        </Button>
        {active && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => {
              setQ("");
              setParams(Object.fromEntries(FILTER_KEYS.map((k) => [k, null])));
            }}
          >
            <X /> Clear
          </Button>
        )}
      </div>

      {showAdvanced && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">More filters</p>
          <div className="flex flex-wrap items-center gap-2">
            {assignees && (
              <FilterSelect label="Assignee" value={value("assignee")} onChange={(v) => setParams({ assignee: v })}>
                <option value="">All assignees</option>
                <option value="open">OPEN (unassigned)</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </FilterSelect>
            )}
            <FilterSelect label="Tag" value={value("tag")} onChange={(v) => setParams({ tag: v })}>
              <option value="">All tags</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label="Due date" value={value("due")} onChange={(v) => setParams({ due: v })}>
              <option value="">Any due date</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due today</option>
              <option value="week">Due this week</option>
              <option value="month">Due this month</option>
              <option value="none">No due date</option>
            </FilterSelect>
            {showArchived && (
              <FilterSelect label="Archived" value={value("archived")} onChange={(v) => setParams({ archived: v })}>
                <option value="">Hide archived</option>
                <option value="include">Include archived</option>
                <option value="only">Archived only</option>
              </FilterSelect>
            )}
            {showCreatedRange && (
              <>
                <label className="text-xs text-slate-500" htmlFor="created-from">
                  Created
                </label>
                <Input
                  id="created-from"
                  type="date"
                  value={value("createdFrom")}
                  onChange={(e) => setParams({ createdFrom: e.target.value })}
                  className="h-9 w-36 text-xs"
                  aria-label="Created from"
                />
                <span className="text-xs text-slate-400">to</span>
                <Input
                  type="date"
                  value={value("createdTo")}
                  onChange={(e) => setParams({ createdTo: e.target.value })}
                  className="h-9 w-36 text-xs"
                  aria-label="Created to"
                />
              </>
            )}
            <FilterSelect label="Sort by" value={value("sort")} onChange={(v) => setParams({ sort: v, dir: null })}>
              <option value="">Sort: default</option>
              {sortOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  Sort: {s.label}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label="Sort direction" value={value("dir")} onChange={(v) => setParams({ dir: v })}>
              <option value="">Default order</option>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </FilterSelect>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <Select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-auto min-w-36 text-sm">
      {children}
    </Select>
  );
}
