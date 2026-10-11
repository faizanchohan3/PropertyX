/** Simple layout for text pages (help, safety, terms, privacy). */
export function StaticPage({ title, intro, updated, children }: { title: string; intro?: string; updated?: string; children: React.ReactNode }) {
  return (
    <div className="container-px py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
        {intro && <p className="mt-3 text-lg text-slate-600">{intro}</p>}
        {updated && <p className="mt-2 text-sm text-slate-400">Last updated {updated}</p>}
        <div className="prose-px mt-8 text-slate-700">{children}</div>
      </div>
    </div>
  );
}
