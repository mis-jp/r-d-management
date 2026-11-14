"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  type SectorProps,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/components/theme/use-theme";

const CHART_THEME = {
  light: { axis: "#64748b", grid: "#eef0f4", cursor: "#f1f5f9", surface: "#ffffff", border: "#e4e7ee", text: "#0f172a" },
  dark: { axis: "#94a3b8", grid: "#223047", cursor: "#1e293b", surface: "#131c2e", border: "#263247", text: "#e2e8f0" },
};

function useChartTheme() {
  const c = CHART_THEME[useTheme().resolved];
  return {
    axis: { fontSize: 11, fill: c.axis },
    grid: c.grid,
    cursor: c.cursor,
    tooltip: {
      contentStyle: { borderRadius: 8, border: `1px solid ${c.border}`, fontSize: 12, background: c.surface, color: c.text },
      labelStyle: { color: c.text },
      itemStyle: { color: c.text },
    },
  };
}

function formatPercent(value: number, total: number) {
  const pct = total ? (value / total) * 100 : 0;
  return `${pct >= 10 || pct === 0 ? Math.round(pct) : pct.toFixed(1)}%`;
}

function NoData({ message, height }: { message: string; height: number }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed text-sm text-slate-500" style={{ height }}>
      {message}
    </div>
  );
}

export type Slice = { label: string; value: number; color: string };

type SliceTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: Slice }>;
  total: number;
  unit: string;
};

function SliceTooltip({ active, payload, total, unit }: SliceTooltipProps) {
  const slice = payload?.[0]?.payload;
  if (!active || !slice) return null;
  return (
    <div className="rounded-lg border bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="flex items-center gap-2">
        <span className="size-2.5 rounded-sm" style={{ backgroundColor: slice.color }} aria-hidden />
        <span className="font-semibold text-slate-900">{slice.label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-2 pl-[18px]">
        <span className="text-base font-semibold tabular-nums text-slate-900">{formatPercent(slice.value, total)}</span>
        <span className="text-slate-500">
          {slice.value} of {total} {unit}
        </span>
      </div>
    </div>
  );
}

/** Donut chart with an accessible text list of the same values. Hovering a slice shows its share. */
export function DonutChart({
  data,
  height = 220,
  centerLabel,
  unit = "tasks",
  showPercent = true,
  emptyMessage = "No tasks in this period",
}: {
  data: Slice[];
  height?: number;
  centerLabel?: string;
  unit?: string;
  showPercent?: boolean;
  emptyMessage?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <NoData message={emptyMessage} height={height} />;
  const visible = data.filter((d) => d.value > 0);
  return (
    <figure className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="relative" style={{ height }} aria-hidden>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{total}</span>
          <span className="text-xs text-slate-500">{centerLabel ?? unit}</span>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={visible}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="none"
              activeShape={(props: SectorProps) => <Sector {...props} outerRadius={(props.outerRadius ?? 0) + 6} />}
            >
              {visible.map((d) => (
                <Cell key={d.label} fill={d.color} className="cursor-pointer outline-none" />
              ))}
            </Pie>
            <Tooltip content={<SliceTooltip total={total} unit={unit} />} wrapperStyle={{ zIndex: 10, outline: "none" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <figcaption>
        <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1 text-sm scrollbar-thin">
          {data.map((d) => (
            <li key={d.label} className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: d.color }} aria-hidden />
              <span className="truncate text-slate-600">{d.label}</span>
              <span className="ml-auto pl-4 font-medium tabular-nums text-slate-900">{d.value}</span>
              {showPercent && (
                <span className="w-11 text-right text-xs tabular-nums text-slate-500">{formatPercent(d.value, total)}</span>
              )}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}

export type SeriesDef = { key: string; label: string; color: string };

export function TrendChart({
  data,
  series,
  height = 260,
  type = "line",
  summary,
  emptyMessage = "No activity during this period",
}: {
  data: Record<string, string | number>[];
  series: SeriesDef[];
  height?: number;
  type?: "line" | "bar";
  summary: string;
  emptyMessage?: string;
}) {
  const theme = useChartTheme();
  const hasData = data.some((row) => series.some((s) => Number(row[s.key]) > 0));
  if (!hasData) return <NoData message={emptyMessage} height={height} />;
  return (
    <figure>
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          {type === "line" ? (
            <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="label" tick={theme.axis} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis allowDecimals={false} tick={theme.axis} tickLine={false} axisLine={false} />
              <Tooltip {...theme.tooltip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {series.map((s) => (
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="label" tick={theme.axis} tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis allowDecimals={false} tick={theme.axis} tickLine={false} axisLine={false} />
              <Tooltip {...theme.tooltip} cursor={{ fill: theme.cursor }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {series.map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

/** Horizontal bars per person/category. `stacked` stacks every series. */
export function HorizontalBars({
  data,
  series,
  stacked = false,
  max,
  unit = "",
  summary,
  emptyMessage = "No data for this period",
}: {
  data: Record<string, string | number>[];
  series: SeriesDef[];
  stacked?: boolean;
  max?: number;
  unit?: string;
  summary: string;
  emptyMessage?: string;
}) {
  const theme = useChartTheme();
  const height = Math.max(160, data.length * 40 + 50);
  const hasData = data.some((row) => series.some((s) => Number(row[s.key]) > 0));
  if (!data.length || !hasData) return <NoData message={emptyMessage} height={160} />;
  return (
    <figure>
      <div style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} horizontal={false} />
            <XAxis type="number" tick={theme.axis} tickLine={false} axisLine={false} domain={max ? [0, max] : undefined} unit={unit} allowDecimals={false} />
            <YAxis type="category" dataKey="label" tick={theme.axis} tickLine={false} axisLine={false} width={110} />
            <Tooltip {...theme.tooltip} cursor={{ fill: theme.cursor }} />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color}
                stackId={stacked ? "a" : undefined}
                radius={stacked ? undefined : [0, 4, 4, 0]}
                maxBarSize={22}
                unit={unit}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}
