import Link from "next/link";

export function AdminHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function AdminTabs({ tabs, active, param = "status", extra = "" }: { tabs: { key: string; label: string }[]; active: string; param?: string; extra?: string }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-white/10 scrollbar-none">
      {tabs.map((t) => (
        <Link key={t.key} href={`?${param}=${t.key}${extra}`} className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold ${active === t.key ? "border-gold-400 text-white" : "border-transparent text-slate-400 hover:text-slate-200"}`}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export function DarkCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`dark-panel p-5 ${className}`}>{children}</div>;
}

export const th = "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400";
export const td = "px-3 py-3 align-top";
export const darkInput = "w-full rounded-xl border border-white/10 bg-night-3 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-gold-400 focus:outline-none";
export const darkBtn = "inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50";
export const okBtn = "inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-500 disabled:opacity-50";
export const badBtn = "inline-flex items-center gap-1.5 rounded-lg bg-red-600/90 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50";

export function Sev({ s }: { s: string }) {
  const m: Record<string, string> = { critical: "bg-red-600 text-white", high: "bg-red-500/20 text-red-300", medium: "bg-amber-500/20 text-amber-300", low: "bg-slate-500/20 text-slate-300" };
  return <span className={`badge ${m[s] ?? m.low}`}>{s}</span>;
}

export function DarkPill({ s }: { s: string }) {
  const good = ["active", "approved", "published", "succeeded", "resolved", "confirmed", "paid"];
  const warn = ["pending", "pending_review", "open", "investigating", "draft", "paused"];
  const bad = ["rejected", "failed", "suspended", "dismissed", "expired", "refunded", "ended"];
  const cls = good.includes(s) ? "bg-emerald-500/15 text-emerald-300" : warn.includes(s) ? "bg-amber-500/15 text-amber-300" : bad.includes(s) ? "bg-red-500/15 text-red-300" : "bg-white/10 text-slate-300";
  return <span className={`badge ${cls}`}>{s.replace(/_/g, " ")}</span>;
}
