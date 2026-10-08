import Link from "next/link";

/** Original PropertyX mark: a roofline forming an "X" with a gold keystone. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#047857" />
      <path d="M9 19.5 20 10l11 9.5" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 30 26.5 18M13.5 18 26.5 30" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="20" cy="24" r="2.6" fill="#e2ad3d" />
    </svg>
  );
}

export function Logo({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="PropertyX Pakistan home">
      <LogoMark />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className={`text-lg font-extrabold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>
            Property<span className="text-gold-500">X</span>
          </span>
          <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${dark ? "text-slate-400" : "text-slate-500"}`}>Pakistan</span>
        </span>
      )}
    </Link>
  );
}
