"use client";

import { useMemo, useState } from "react";
import { estimateConstructionCost, formatPKR, formatPKRFull, formatNumber, sqftPerUnit, type ConstructionInput, type ConstructionRates, type FinishingQuality } from "@propertyx/shared";

export type CityRates = { slug: string; name: string; rates: ConstructionRates };

const PLOT_UNITS = [
  { key: "marla", label: "Marla" },
  { key: "kanal", label: "Kanal" },
  { key: "sqyd", label: "Sq. Yd." },
  { key: "sqft", label: "Sq. Ft." },
] as const;

const HOUSE_TYPES: { key: ConstructionInput["houseType"]; label: string }[] = [
  { key: "single_unit", label: "Single unit" },
  { key: "double_unit", label: "Double unit" },
  { key: "basement_house", label: "With basement" },
];

const FINISHING: { key: FinishingQuality; label: string; hint: string }[] = [
  { key: "basic", label: "Basic", hint: "Local tiles, standard fittings" },
  { key: "standard", label: "Standard", hint: "Good-quality local materials" },
  { key: "premium", label: "Premium", hint: "Imported tiles, branded fittings" },
  { key: "luxury", label: "Luxury", hint: "Top-end imported finishes" },
];

const BAR_COLORS = ["bg-brand-700", "bg-gold-500", "bg-sky-500", "bg-teal-500", "bg-amber-700", "bg-rose-500", "bg-violet-500", "bg-slate-500"];

export function ConstructionCalculator({ cities }: { cities: CityRates[] }) {
  const [city, setCity] = useState(cities.find((c) => c.slug === "lahore")?.slug ?? cities[0].slug);
  const [plotSize, setPlotSize] = useState("10");
  const [unit, setUnit] = useState<(typeof PLOT_UNITS)[number]["key"]>("marla");
  const [floors, setFloors] = useState(2);
  const [houseType, setHouseType] = useState<ConstructionInput["houseType"]>("single_unit");
  const [finishing, setFinishing] = useState<FinishingQuality>("standard");
  const [covered, setCovered] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [kitchens, setKitchens] = useState("");

  const rates = (cities.find((c) => c.slug === city) ?? cities[0]).rates;
  const plotSqft = (Number(plotSize) || 0) * sqftPerUnit(unit);
  const num = (v: string) => (v.trim() && Number(v) >= 0 ? Number(v) : undefined);
  const result = useMemo(
    () => (plotSqft > 0 ? estimateConstructionCost({ plotSizeSqft: plotSqft, floors, houseType, finishing, coveredAreaSqft: num(covered), bathrooms: num(bathrooms), kitchens: num(kitchens) }, rates) : null),
    [plotSqft, floors, houseType, finishing, covered, bathrooms, kitchens, rates],
  );

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <form className="card space-y-5 p-6" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="label" htmlFor="cc-city">City</label>
          <select id="cc-city" className="input" value={city} onChange={(e) => setCity(e.target.value)}>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="cc-plot">Plot size</label>
          <div className="flex gap-2">
            <input id="cc-plot" className="input" type="number" min={0} step="any" inputMode="decimal" value={plotSize} onChange={(e) => setPlotSize(e.target.value)} />
            <select className="input w-32 shrink-0" value={unit} onChange={(e) => setUnit(e.target.value as typeof unit)} aria-label="Plot size unit">
              {PLOT_UNITS.map((u) => (
                <option key={u.key} value={u.key}>{u.label}</option>
              ))}
            </select>
          </div>
          {plotSqft > 0 && unit !== "sqft" && <p className="mt-1 text-xs text-slate-500">≈ {formatNumber(plotSqft)} sq ft</p>}
        </div>
        <div>
          <p className="label">Floors</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((f) => (
              <button key={f} type="button" className={`chip ${floors === f ? "chip-active" : ""}`} onClick={() => setFloors(f)}>
                {f === 1 ? "Ground only" : `${f} floors`}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="label">House type</p>
          <div className="flex flex-wrap gap-2">
            {HOUSE_TYPES.map((t) => (
              <button key={t.key} type="button" className={`chip ${houseType === t.key ? "chip-active" : ""}`} onClick={() => setHouseType(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="label">Finishing quality</p>
          <div className="grid grid-cols-2 gap-2">
            {FINISHING.map((f) => (
              <button key={f.key} type="button" onClick={() => setFinishing(f.key)} className={`rounded-xl border p-3 text-left transition ${finishing === f.key ? "border-brand-700 bg-brand-50" : "border-slate-300 hover:border-slate-400"}`}>
                <span className="block text-sm font-semibold text-slate-900">{f.label}</span>
                <span className="block text-xs text-slate-500">{f.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <details className="rounded-xl border border-slate-200 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">Advanced (optional)</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="cc-covered">Covered area (sq ft)</label>
              <input id="cc-covered" className="input" type="number" min={0} placeholder={result ? String(result.coveredAreaSqft) : "Auto"} value={covered} onChange={(e) => setCovered(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="cc-bath">Bathrooms</label>
              <input id="cc-bath" className="input" type="number" min={0} placeholder={result ? String(result.bathrooms) : "Auto"} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="cc-kitchen">Kitchens</label>
              <input id="cc-kitchen" className="input" type="number" min={0} placeholder={result ? String(result.kitchens) : "Auto"} value={kitchens} onChange={(e) => setKitchens(e.target.value)} />
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Left blank, covered area assumes about 75% ground coverage per floor.</p>
        </details>
      </form>

      <div className="card p-6 lg:sticky lg:top-24 lg:self-start" aria-live="polite">
        {result ? (
          <>
            <p className="text-sm font-medium text-slate-500">Estimated construction cost</p>
            <p className="mt-1 text-4xl font-extrabold text-brand-800">{formatPKR(result.total)}</p>
            <p className="mt-1 text-sm text-slate-500">
              Likely range {formatPKR(result.rangeLow)} – {formatPKR(result.rangeHigh)}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center">
              {[
                ["Covered area", `${formatNumber(result.coveredAreaSqft)} sq ft`],
                ["Per sq ft", `PKR ${formatNumber(result.perSqft)}`],
                ["Baths / kitchens", `${result.bathrooms} / ${result.kitchens}`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-800">{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-slate-100">
              {result.items.map((i, idx) => (
                <span key={i.key} className={BAR_COLORS[idx % BAR_COLORS.length]} style={{ width: `${i.share * 100}%` }} title={i.label} />
              ))}
            </div>
            <ul className="mt-4 divide-y divide-slate-100">
              {result.items.map((i, idx) => (
                <li key={i.key} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${BAR_COLORS[idx % BAR_COLORS.length]}`} />
                  <span className="flex-1 text-slate-700">{i.label}</span>
                  <span className="w-12 text-right text-xs text-slate-400">{Math.round(i.share * 100)}%</span>
                  <span className="w-36 text-right font-semibold text-slate-900">{formatPKRFull(i.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-slate-400">
              Estimate only, excluding plot cost, approvals, boundary wall and furnishing. Rates effective {new Date(rates.effectiveDate).toLocaleDateString("en-PK", { dateStyle: "medium" })}.
            </p>
          </>
        ) : (
          <p className="py-16 text-center text-slate-500">Enter a plot size to see your estimate.</p>
        )}
      </div>
    </div>
  );
}
