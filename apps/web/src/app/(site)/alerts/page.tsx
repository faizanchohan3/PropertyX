import Link from "next/link";
import { listSavedSearches } from "@propertyx/core";
import { requireUser, db } from "@/lib/server";
import { SavedSearchesList } from "@/components/saved-searches";
import { EmptyState } from "@/components/seo";

export const metadata = { title: "Saved searches & alerts", robots: { index: false } };

export default async function AlertsPage() {
  const user = await requireUser("/alerts");
  const items = await listSavedSearches(db, user);
  return (
    <div className="container-px py-8">
      <h1 className="text-3xl font-extrabold">Saved searches & alerts</h1>
      <p className="mb-6 mt-1 text-slate-500">
        We'll tell you when new properties match. Choose channels in{" "}
        <Link href="/account/notifications" className="font-semibold text-brand-700">
          notification settings
        </Link>
        .
      </p>
      {items.length === 0 ? (
        <EmptyState title="No saved searches" body="Run a search and click “Save search” to get alerts about new matching properties." action={<Link href="/search" className="btn-primary">Start a search</Link>} />
      ) : (
        <SavedSearchesList items={items.map((s) => ({ id: s.id, name: s.name, query: s.query, frequency: s.frequency, isActive: s.isActive, total: s.total, newCount: s.newCount, matchCount: s.matchCount, lastNotifiedAt: s.lastNotifiedAt?.toISOString() ?? null }))} />
      )}
    </div>
  );
}
