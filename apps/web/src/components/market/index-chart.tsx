"use client";

import { TrendChart, Bars, type YFormat } from "@/components/dashboard/charts";

const monthYear = (v: string) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("en-PK", { month: "short", year: "numeric" });
};

type Series = { key: string; label: string; color?: string };

/** Price-index charts with month/year axis labels (period points are month, quarter or year starts). */
export function IndexChart({ data, series, yFormat = "pkr", height }: { data: Record<string, unknown>[]; series: Series[]; yFormat?: YFormat; height?: number }) {
  return <TrendChart data={data} x="period" series={series} yFormat={yFormat} height={height} formatX={monthYear} />;
}

export function IndexBars({ data, series, height }: { data: Record<string, unknown>[]; series: Series[]; height?: number }) {
  return <Bars data={data.map((d) => ({ ...d, period: monthYear(String(d.period)) }))} x="period" series={series} height={height} yFormat="number" />;
}
