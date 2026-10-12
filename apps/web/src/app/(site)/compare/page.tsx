import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Scale, X } from "lucide-react";
import { createSearchEngine } from "@propertyx/search";
import { PROPERTY_TYPE_LABELS, formatArea, formatPKR, listingPath, COUNTRY } from "@propertyx/shared";
import { db } from "@/lib/server";
import { priceLabel } from "@/components/property-card";

export const metadata: Metadata = { title: "Compare properties", description: "Compare up to 4 properties side by side: price, size, price per square foot, bedrooms and more.", alternates: { canonical: "/compare" }, robots: { index: false } };

type Props = { searchParams: Promise<{ ids?: string }> };
const UUID = /^[0-9a-f-]{36}$/i;

export default async function ComparePage({ searchParams }: Props) {
  const { ids: raw } = await searchParams;
  const ids = [...new Set((raw ?? "").split(",").filter((x) => UUID.test(x)))].slice(0, 4);
  const items = ids.length ? await createSearchEngine(db).cardsByIds(ids, { anyStatus: true }) : [];
  const ordered = ids.map((id) => items.find((i) => i.id === id)).filter((x): x is (typeof items)[number] => !!x);
  const without = (id: string) => `/compare?ids=${ordered.filter((o) => o.id !== id).map((o) => o.id).join(",")}`;
  const min = (vals: (number | null)[]) => Math.min(...vals.filter((v): v is number => v != null && v > 0));
  const cheapest = min(ordered.map((o) => o.price));
  const bestPpsf = min(ordered.map((o) => o.pricePerSqft));
  const biggest = Math.max(...ordered.map((o) => o.areaSqft));

  const rows: { label: string; cell: (o: (typeof ordered)[number]) => React.ReactNode; best?: (o: (typeof ordered)[number]) => boolean }[] = [
    { label: "Price", cell: (o) => priceLabel(o), best: (o) => o.price === cheapest },
    { label: "Price per sq ft", cell: (o) => (o.pricePerSqft ? `${COUNTRY.currency} ${Math.round(o.pricePerSqft).toLocaleString()}` : "—"), best: (o) => o.pricePerSqft === bestPpsf },
    { label: "Size", cell: (o) => `${formatArea(o.areaValue, o.areaUnit)} (${Math.round(o.areaSqft).toLocaleString()} sq ft)`, best: (o) => o.areaSqft === biggest },
    { label: "Type", cell: (o) => PROPERTY_TYPE_LABELS[o.type] ?? o.type },
    { label: "Bedrooms", cell: (o) => o.beds ?? "—" },
    { label: "Bathrooms", cell: (o) => o.baths ?? "—" },
    { label: "Location", cell: (o) => o.locationFullName ?? o.cityName },
    { label: "Verification", cell: (o) => (o.verificationLevel >= 2 ? `Level ${o.verificationLevel} verified` : "Not verified") },
    { label: "Installments", cell: (o) => (o.installmentAvailable ? "Available" : "No") },
    { label: "Listed by", cell: (o) => o.agencyName ?? o.agentName ?? "Owner" },
    { label: "Status", cell: (o) => (o.status === "active" ? "Available" : o.status) },
  ];

  return (
    <div className="container-px py-12">
      <h1 className="flex items-center gap-2 text-3xl font-extrabold sm:text-4xl"><Scale className="h-8 w-8 text-gold-500" /> Compare properties</h1>
      {ordered.length < 2 ? (
        <div className="card mt-8 max-w-xl p-8">
          <p className="font-semibold text-slate-800">Pick at least 2 properties to compare.</p>
          <p className="mt-2 text-sm text-slate-500">Tick <b>Compare</b> on up to 4 property cards in search results. A bar appears at the bottom of the screen; press <b>Compare</b> there.</p>
          <Link href="/search" className="btn-primary mt-5">Browse properties</Link>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="w-40" />
                {ordered.map((o) => (
                  <th key={o.id} className="px-2 pb-4 text-left align-top font-normal">
                    <div className="relative">
                      <Link href={listingPath(o.slug)} className="block overflow-hidden rounded-xl">
                        <div className="relative aspect-[4/3] bg-slate-100">{o.coverUrl && <Image src={o.coverUrl} alt="" fill sizes="25vw" className="object-cover" />}</div>
                      </Link>
                      <Link href={without(o.id)} className="absolute right-2 top-2 rounded-full bg-white/95 p-1 text-slate-600 shadow hover:text-red-600" aria-label="Remove from comparison"><X className="h-4 w-4" /></Link>
                    </div>
                    <Link href={listingPath(o.slug)} className="mt-2 line-clamp-2 font-semibold text-slate-900 hover:text-brand-700">{o.title}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.label} className={i % 2 ? "" : "bg-slate-50"}>
                  <th className="rounded-l-lg px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{r.label}</th>
                  {ordered.map((o) => (
                    <td key={o.id} className={`px-3 py-3 last:rounded-r-lg ${r.best?.(o) ? "font-bold text-emerald-700" : "text-slate-800"}`}>{r.cell(o)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-500">Green marks the best value in each row: lowest price, lowest price per sq ft, largest size. {formatPKR(cheapest)} is the cheapest option here.</p>
        </div>
      )}
    </div>
  );
}
