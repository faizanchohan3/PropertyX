/** Market figures come from asking prices on the site, not completed sales; say so wherever they appear. */
export function MarketDataNote({ demo = false }: { demo?: boolean }) {
  return (
    <p className="text-xs text-slate-400">
      Based on asking prices of listings on Bismillah, not completed sales.{demo && " The site is in demo mode, so these figures come from sample listings."}
    </p>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function ChangePill({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-slate-400">—</span>;
  const up = pct >= 0;
  return <span className={`badge ${up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{`${up ? "▲" : "▼"} ${Math.abs(pct)}%`}</span>;
}
