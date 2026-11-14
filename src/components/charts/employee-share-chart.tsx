"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { DonutChart } from "./charts";

export type EmployeeShareRow = {
  id: string;
  name: string;
  active: number;
  inProgress: number;
  completedInRange: number;
};

const PALETTE = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#a855f7", "#ec4899", "#14b8a6", "#f97316", "#84cc16"];

const METRICS = [
  { key: "active", label: "Active", unit: "active tasks", empty: "No active tasks assigned" },
  { key: "inProgress", label: "In progress", unit: "tasks in progress", empty: "Nothing in progress" },
  { key: "completedInRange", label: "Completed", unit: "completed tasks", empty: "No completions in this period" },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

/** Each employee's share of the team's tasks; hover a slice for the name and percentage. */
export function EmployeeShareChart({ rows, height = 220 }: { rows: EmployeeShareRow[]; height?: number }) {
  const [metric, setMetric] = useState<MetricKey>("active");
  const current = METRICS.find((m) => m.key === metric)!;

  // Colors follow a stable, name-sorted order so an employee keeps their color when the metric changes.
  const colorFor = new Map(
    [...rows].sort((a, b) => a.name.localeCompare(b.name)).map((r, i) => [r.id, PALETTE[i % PALETTE.length]!]),
  );
  const slices = rows
    .map((r) => ({ label: r.name, value: r[metric], color: colorFor.get(r.id)! }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div>
      <div role="group" aria-label="Measure" className="mb-4 inline-flex rounded-lg border bg-slate-50 p-0.5 text-xs">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            aria-pressed={metric === m.key}
            onClick={() => setMetric(m.key)}
            className={cn(
              "rounded-md px-2.5 py-1 font-medium transition-colors",
              metric === m.key ? "bg-surface text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <DonutChart data={slices} height={height} unit={current.unit} centerLabel={current.unit} emptyMessage={current.empty} />
    </div>
  );
}
