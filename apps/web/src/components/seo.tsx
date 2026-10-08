import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function JsonLd({ data }: { data: unknown }) {
  // JSON.stringify output is safe inside <script> once "<" is escaped
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function Breadcrumbs({ items, baseUrl }: { items: { label: string; href?: string }[]; baseUrl: string }) {
  const all = [{ label: "Home", href: "/" }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        {all.map((b, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
            {b.href && i < all.length - 1 ? (
              <Link href={b.href} className="hover:text-brand-700">
                {b.label}
              </Link>
            ) : (
              <span className="text-slate-700">{b.label}</span>
            )}
          </span>
        ))}
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((b, i) => ({ "@type": "ListItem", position: i + 1, name: b.label, ...(b.href ? { item: `${baseUrl}${b.href}` } : {}) })),
        }}
      />
    </>
  );
}

export function Pagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (p: number) => string }) {
  if (totalPages <= 1) return null;
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1, page - 2, page + 2].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);
  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} rel="prev" className="btn-outline btn-sm">
          Previous
        </Link>
      )}
      {sorted.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - sorted[i - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
          <Link href={hrefFor(p)} aria-current={p === page ? "page" : undefined} className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold ${p === page ? "bg-brand-700 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
            {p}
          </Link>
        </span>
      ))}
      {page < totalPages && (
        <Link href={hrefFor(page + 1)} rel="next" className="btn-outline btn-sm">
          Next
        </Link>
      )}
    </nav>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-2xl">🏡</div>
      <p className="text-lg font-bold text-slate-900">{title}</p>
      {body && <p className="mt-1 max-w-md text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
