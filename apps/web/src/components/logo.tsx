import Link from "next/link";

/** Bismillah mark: a home with an arched gold doorway and a crescent. Keep in sync with public/icon.svg. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#047857" />
      <path d="M8 20 20 9.5 32 20" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.5 18v12.5h17V18" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 30.5v-5a2.5 2.5 0 0 1 5 0v5z" fill="#e2ad3d" />
      <circle cx="29.5" cy="8.5" r="3.4" fill="#e2ad3d" />
      <circle cx="31" cy="7.4" r="2.9" fill="#047857" />
    </svg>
  );
}

export function Logo({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Bismillah Pakistan home">
      <LogoMark />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className={`text-lg font-extrabold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>
            Bismillah
          </span>
          <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${dark ? "text-slate-400" : "text-slate-500"}`}>Pakistan</span>
        </span>
      )}
    </Link>
  );
}
