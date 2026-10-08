import Link from "next/link";
import { adminLocations } from "@propertyx/core";
import { requirePermission, db } from "@/lib/server";
import { allCities } from "@/lib/queries";
import { AdminHeader, darkInput, okBtn, darkBtn } from "@/components/admin/ui";
import { LocationEditor, AddLocationForm } from "@/components/admin/location-editor";

export const metadata = { title: "Areas & guides" };

export default async function AdminAreas({ searchParams }: { searchParams: Promise<{ city?: string; q?: string }> }) {
  const user = await requirePermission("content.manage", "/admin/areas");
  const sp = await searchParams;
  const [rows, cities] = await Promise.all([adminLocations(db, user, { city: sp.city, q: sp.q }), allCities()]);
  return (
    <div className="space-y-5">
      <AdminHeader title="Areas & guides" subtitle="Edit SEO content, investment outlook and area guides for /area pages, or add new societies and blocks." />
      <AddLocationForm cities={cities} />
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/areas" className={`${darkBtn} ${!sp.city ? "border-gold-400 text-gold-300" : ""}`}>All</Link>
        {cities.map((c) => (
          <Link key={c.slug} href={`?city=${c.slug}`} className={`${darkBtn} ${sp.city === c.slug ? "border-gold-400 text-gold-300" : ""}`}>{c.name}</Link>
        ))}
        <form className="ml-auto flex gap-2">
          {sp.city && <input type="hidden" name="city" value={sp.city} />}
          <input name="q" defaultValue={sp.q} placeholder="Search" className={`${darkInput} w-48`} />
          <button className={okBtn}>Go</button>
        </form>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <LocationEditor
            key={r.id as string}
            loc={{
              id: r.id as string,
              kind: r.kind as string,
              name: r.name as string,
              fullName: r.full_name as string,
              slug: r.slug as string,
              activeListings: Number(r.active_listings),
              overview: (r.overview as string) ?? "",
              investmentOutlook: (r.investment_outlook as string) ?? "",
              highlights: (r.highlights as string[]) ?? [],
              seoTitle: (r.seo_title as string) ?? "",
              seoDescription: (r.seo_description as string) ?? "",
              guide: r.guide_body ? { title: r.guide_title as string, summary: r.guide_summary as string, body: r.guide_body as string, pros: (r.guide_pros as string[]) ?? [], cons: (r.guide_cons as string[]) ?? [] } : null,
            }}
          />
        ))}
      </div>
    </div>
  );
}
