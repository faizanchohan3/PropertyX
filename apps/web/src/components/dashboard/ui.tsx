import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, dark = false, href, tone = "brand" }: { label: string; value: string | number; hint?: string; icon?: LucideIcon; dark?: boolean; href?: string; tone?: "brand" | "gold" | "red" | "slate" }) {
  const tones = { brand: "bg-brand-50 text-brand-700", gold: "bg-gold-50 text-gold-700", red: "bg-red-50 text-red-600", slate: "bg-slate-100 text-slate-600" };
  const body = (
    <div className={`${dark ? "dark-panel" : "card"} flex items-start justify-between gap-3 p-5 ${href ? "transition hover:border-brand-300" : ""}`}>
      <div className="min-w-0">
        <p className={`text-xs font-semibold uppercase tracking-wide ${dark ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
        <p className={`mt-1.5 break-words text-xl font-extrabold leading-tight xl:text-2xl ${dark ? "text-white" : "text-slate-900"}`}>{value}</p>
        {hint && <p className={`mt-0.5 text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>{hint}</p>}
      </div>
      {Icon && (
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${dark ? "bg-white/10 text-gold-300" : tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      )}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Panel({ title, children, actions, dark = false, className = "" }: { title?: string; children: React.ReactNode; actions?: React.ReactNode; dark?: boolean; className?: string }) {
  return (
    <section className={`${dark ? "dark-panel" : "card"} p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className={`font-bold ${dark ? "text-white" : "text-slate-900"}`}>{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Tabs({ tabs, active, base }: { tabs: { key: string; label: string; count?: number }[]; active: string; base: string }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 scrollbar-none">
      {tabs.map((t) => (
        <Link key={t.key} href={`${base}${base.includes("?") ? "&" : "?"}status=${t.key}`} className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold ${active === t.key ? "border-brand-700 text-brand-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
          {t.label}
          {t.count != null && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{t.count}</span>}
        </Link>
      ))}
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center">
      <p className="font-semibold text-slate-800">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const fmtDate = (d: Date | string | null | undefined, withTime = false) =>
  d ? new Date(d).toLocaleString("en-PK", withTime ? { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" } : { dateStyle: "medium", timeZone: "Asia/Karachi" }) : "—";

export const timeAgo = (d: Date | string) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(d);
};
