import Link from "next/link";
import { TrendingDown } from "lucide-react";
import { listSaved } from "@propertyx/core";
import { formatPKR, formatPriceWords } from "@propertyx/shared";
import { requireUser, db } from "@/lib/server";
import { PropertyCard } from "@/components/property-card";
import { EmptyState } from "@/components/seo";

export const metadata = { title: "Saved properties", robots: { index: false } };

export default async function SavedPage() {
  const user = await requireUser("/saved");
  const items = await listSaved(db, user);
  const drops = items.filter((i) => i.priceAtSave && i.price < i.priceAtSave);
  return (
    <div className="container-px py-8">
      <h1 className="text-3xl font-extrabold">Saved properties</h1>
      <p className="mt-1 text-slate-500">We'll notify you if any of these drop in price. Tick “Compare” on up to 4 to compare them side by side.</p>
      {drops.length > 0 && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-red-800">
            <TrendingDown className="h-5 w-5" /> {drops.length} saved {drops.length === 1 ? "property has" : "properties have"} dropped in price
          </p>
          <ul className="mt-2 space-y-1 text-sm text-red-800">
            {drops.map((d) => (
              <li key={d.id}>
                <Link href={`/property/${d.slug}`} className="underline">
                  {d.title}
                </Link>{" "}
                — now {formatPKR(d.price)} (down {formatPriceWords(d.priceAtSave! - d.price)} since you saved it)
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyState title="No saved properties yet" body="Tap the heart on any property to save it here and get price-drop alerts." action={<Link href="/search" className="btn-primary">Browse properties</Link>} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((l) => (
              <div key={l.id} className="relative">
                {l.status !== "active" && <span className="badge absolute left-3 top-14 z-10 bg-slate-900 text-white">No longer available</span>}
                <PropertyCard l={l} saved />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
