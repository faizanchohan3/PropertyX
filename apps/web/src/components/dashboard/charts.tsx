"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend, LineChart, Line } from "recharts";

const PALETTE = ["#10b981", "#e2ad3d", "#60a5fa", "#f472b6", "#a78bfa", "#f97316"];

type Series = { key: string; label: string; color?: string };

/** Serializable formatter presets so Server Components can configure charts. */
export type YFormat = "number" | "pkr" | "percent";
const PRESETS: Record<YFormat, (v: number) => string> = {
  number: (v) => v.toLocaleString(),
  pkr: (v) => (Math.abs(v) >= 10_000_000 ? `${(v / 10_000_000).toFixed(1)} Cr` : Math.abs(v) >= 100_000 ? `${(v / 100_000).toFixed(1)} L` : Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}K` : String(Math.round(v))),
  percent: (v) => `${v}%`,
};

function axis(dark: boolean) {
  const c = dark ? "#94a3b8" : "#64748b";
  return { stroke: c, fontSize: 11, tickLine: false, axisLine: false };
}

const shortDate = (v: string) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
};

export function TrendChart({ data, x, series, dark = false, height = 260, formatX = shortDate, formatY: fy, yFormat }: { data: Record<string, unknown>[]; x: string; series: Series[]; dark?: boolean; height?: number; formatX?: (v: string) => string; formatY?: (v: number) => string; yFormat?: YFormat }) {
  const formatY = fy ?? (yFormat ? PRESETS[yFormat] : undefined);
  const grid = dark ? "rgba(255,255,255,.07)" : "#eef2f7";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color ?? PALETTE[i]} stopOpacity={0.35} />
              <stop offset="100%" stopColor={s.color ?? PALETTE[i]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey={x} {...axis(dark)} tickFormatter={formatX} minTickGap={24} />
        <YAxis {...axis(dark)} tickFormatter={formatY} width={formatY ? 64 : 40} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,.15)", background: dark ? "#1a2540" : "#fff", color: dark ? "#e2e8f0" : "#0f172a" }} labelFormatter={(v) => formatX(String(v))} formatter={(v: number) => (formatY ? formatY(v) : v.toLocaleString())} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: dark ? "#cbd5e1" : "#475569" }} />}
        {series.map((s, i) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color ?? PALETTE[i]} strokeWidth={2} fill={`url(#g-${s.key})`} connectNulls />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Bars({ data, x, series, dark = false, height = 260, stacked = false, formatY: fy, yFormat, horizontal = false }: { data: Record<string, unknown>[]; x: string; series: Series[]; dark?: boolean; height?: number; stacked?: boolean; formatY?: (v: number) => string; yFormat?: YFormat; horizontal?: boolean }) {
  const formatY = fy ?? (yFormat ? PRESETS[yFormat] : undefined);
  const grid = dark ? "rgba(255,255,255,.07)" : "#eef2f7";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 8, left: horizontal ? 40 : -8, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" {...axis(dark)} tickFormatter={formatY} />
            <YAxis type="category" dataKey={x} {...axis(dark)} width={110} />
          </>
        ) : (
          <>
            <XAxis dataKey={x} {...axis(dark)} />
            <YAxis {...axis(dark)} tickFormatter={formatY} width={formatY ? 64 : 40} />
          </>
        )}
        <Tooltip cursor={{ fill: dark ? "rgba(255,255,255,.05)" : "#f1f5f9" }} contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,.15)", background: dark ? "#1a2540" : "#fff", color: dark ? "#e2e8f0" : "#0f172a" }} formatter={(v: number) => (formatY ? formatY(v) : v.toLocaleString())} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color ?? PALETTE[i]} radius={[6, 6, 0, 0]} stackId={stacked ? "a" : undefined} maxBarSize={42} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Lines({ data, x, series, dark = false, height = 280, formatX, formatY: fy, yFormat }: { data: Record<string, unknown>[]; x: string; series: Series[]; dark?: boolean; height?: number; formatX?: (v: string) => string; formatY?: (v: number) => string; yFormat?: YFormat }) {
  const formatY = fy ?? (yFormat ? PRESETS[yFormat] : undefined);
  const grid = dark ? "rgba(255,255,255,.07)" : "#eef2f7";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey={x} {...axis(dark)} tickFormatter={formatX} minTickGap={24} />
        <YAxis {...axis(dark)} tickFormatter={formatY} width={formatY ? 70 : 40} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "none", background: dark ? "#1a2540" : "#fff", color: dark ? "#e2e8f0" : "#0f172a" }} formatter={(v: number) => (formatY ? formatY(v) : v.toLocaleString())} labelFormatter={(v) => (formatX ? formatX(String(v)) : String(v))} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color ?? PALETTE[i]} strokeWidth={2.5} dot={false} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
