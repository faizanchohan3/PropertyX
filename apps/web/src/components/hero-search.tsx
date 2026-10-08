"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Map as MapIcon } from "lucide-react";
import { serializeSearchQuery, PROPERTY_TYPES, TYPE_GROUPS, type SearchQuery, type PropertyType } from "@propertyx/shared";
import { CITY_LINKS } from "./nav-data";
import { LocationAutocomplete } from "./location-autocomplete";

const TABS = [
  { key: "buy", label: "Buy" },
  { key: "rent", label: "Rent" },
  { key: "projects", label: "Projects" },
  { key: "plots", label: "Plots" },
  { key: "commercial", label: "Commercial" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const PRICE_SALE = [
  { v: "", l: "Any" },
  { v: "5000000", l: "50 Lakh" },
  { v: "10000000", l: "1 Crore" },
  { v: "20000000", l: "2 Crore" },
  { v: "35000000", l: "3.5 Crore" },
  { v: "50000000", l: "5 Crore" },
  { v: "100000000", l: "10 Crore" },
  { v: "200000000", l: "20 Crore" },
];
const PRICE_RENT = [
  { v: "", l: "Any" },
  { v: "25000", l: "25 Thousand" },
  { v: "50000", l: "50 Thousand" },
  { v: "100000", l: "1 Lakh" },
  { v: "200000", l: "2 Lakh" },
  { v: "500000", l: "5 Lakh" },
];

function typesFor(tab: Tab) {
  if (tab === "plots") return PROPERTY_TYPES.filter((t) => t.category === "plot" || t.category === "agricultural");
  if (tab === "commercial") return PROPERTY_TYPES.filter((t) => t.category === "commercial" || t.key === "commercial_plot");
  return PROPERTY_TYPES.filter((t) => t.category === "residential");
}

export function HeroSearch() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("buy");
  const [city, setCity] = useState("lahore");
  const [loc, setLoc] = useState<{ slug: string; label: string } | null>(null);
  const [type, setType] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const rent = tab === "rent";
  const prices = rent ? PRICE_RENT : PRICE_SALE;
  const rooms = tab === "buy" || tab === "rent";

  const build = (): Partial<SearchQuery> => {
    const types: PropertyType[] | undefined = type ? [type as PropertyType] : tab === "plots" ? TYPE_GROUPS.plots : tab === "commercial" ? TYPE_GROUPS.commercial : undefined;
    return {
      purpose: rent ? "rent" : "sale",
      types,
      city: city || undefined,
      location: loc?.slug,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      beds: beds ? [Number(beds)] : undefined,
      bathsMin: baths ? Number(baths) : undefined,
    };
  };

  const go = (map = false) => {
    if (tab === "projects" && !map) {
      router.push(`/projects${city ? `/${city}` : ""}`);
      return;
    }
    const qs = serializeSearchQuery(build()).toString();
    router.push(`${map ? "/map" : "/search"}?${qs}`);
  };

  return (
    <div className="w-full">
      <div className="flex gap-1 overflow-x-auto scrollbar-none" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => {
              setTab(t.key);
              setType("");
              setPriceMin("");
              setPriceMax("");
            }}
            className={`rounded-t-xl px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition ${tab === t.key ? "bg-white text-brand-800" : "bg-white/15 text-white hover:bg-white/25"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(false);
        }}
        className="rounded-b-2xl rounded-tr-2xl bg-white p-4 shadow-2xl sm:p-5"
      >
        <div className="grid gap-3 md:grid-cols-[160px_1fr_180px]">
          <div>
            <label className="label text-xs uppercase tracking-wide text-slate-500" htmlFor="hs-city">City</label>
            <select id="hs-city" className="input" value={city} onChange={(e) => { setCity(e.target.value); setLoc(null); }}>
              <option value="">All cities</option>
              {CITY_LINKS.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className="label text-xs uppercase tracking-wide text-slate-500">Area / Society</span>
            <LocationAutocomplete
              city={city || undefined}
              value={loc}
              onSelect={(s) => {
                setLoc(s ? { slug: s.slug, label: s.name } : null);
                if (s?.citySlug) setCity(s.citySlug);
              }}
              placeholder="e.g. DHA Phase 6, Bahria Town, F-11"
            />
          </div>
          {tab !== "projects" ? (
            <div>
              <label className="label text-xs uppercase tracking-wide text-slate-500" htmlFor="hs-type">Property type</label>
              <select id="hs-type" className="input" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">{tab === "plots" ? "All plots" : tab === "commercial" ? "All commercial" : "All homes"}</option>
                {typesFor(tab).map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="hidden md:block" />
          )}
        </div>
        {tab !== "projects" && (
          <div className={`mt-3 grid gap-3 grid-cols-2 ${rooms ? "md:grid-cols-4" : "md:grid-cols-2"}`}>
            <div>
              <label className="label text-xs uppercase tracking-wide text-slate-500" htmlFor="hs-pmin">Min price</label>
              <select id="hs-pmin" className="input" value={priceMin} onChange={(e) => setPriceMin(e.target.value)}>
                {prices.map((p) => (
                  <option key={p.v} value={p.v}>
                    {p.l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs uppercase tracking-wide text-slate-500" htmlFor="hs-pmax">Max price</label>
              <select id="hs-pmax" className="input" value={priceMax} onChange={(e) => setPriceMax(e.target.value)}>
                {prices.map((p) => (
                  <option key={p.v} value={p.v}>
                    {p.l}
                  </option>
                ))}
              </select>
            </div>
            {rooms && (
              <>
                <div>
                  <label className="label text-xs uppercase tracking-wide text-slate-500" htmlFor="hs-beds">Beds</label>
                  <select id="hs-beds" className="input" value={beds} onChange={(e) => setBeds(e.target.value)}>
                    <option value="">Any</option>
                    <option value="0">Studio</option>
                    {[1, 2, 3, 4, 5].map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                    <option value="6">6+</option>
                  </select>
                </div>
                <div>
                  <label className="label text-xs uppercase tracking-wide text-slate-500" htmlFor="hs-baths">Baths</label>
                  <select id="hs-baths" className="input" value={baths} onChange={(e) => setBaths(e.target.value)}>
                    <option value="">Any</option>
                    {[1, 2, 3].map((b) => (
                      <option key={b} value={b}>
                        {b}+
                      </option>
                    ))}
                    <option value="4">4+</option>
                  </select>
                </div>
              </>
            )}
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="submit" className="btn-primary flex-1 py-3 text-base">
            <Search className="h-5 w-5" /> {tab === "projects" ? "Search Projects" : "Search Properties"}
          </button>
          <button type="button" onClick={() => go(true)} className="btn-outline py-3 text-base sm:w-56">
            <MapIcon className="h-5 w-5" /> Search on Map
          </button>
        </div>
      </form>
    </div>
  );
}
