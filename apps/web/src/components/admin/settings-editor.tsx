"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import type { ConstructionRates, FinishingQuality } from "@propertyx/shared";
import { api } from "@/lib/client";
import { toast } from "../toast";
import { darkInput, okBtn, darkBtn } from "./ui";

async function saveSetting(key: string, value: unknown) {
  await api("/api/v1/admin/setting.set", { body: { key, value } });
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="dark-panel space-y-4 p-5">
      <div>
        <h2 className="font-bold text-white">{title}</h2>
        {desc && <p className="text-xs text-slate-400">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

function SaveBtn({ onSave }: { onSave: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button
      className={okBtn}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onSave();
          toast("Saved");
          router.refresh();
        } catch (e) {
          toast((e as Error).message, "error");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
    </button>
  );
}

const L = ({ t, children }: { t: string; children: React.ReactNode }) => (
  <label className="block space-y-1 text-xs text-slate-400">
    <span>{t}</span>
    {children}
  </label>
);

type Homepage = { heroTitle: string; heroSubtitle: string; announcement: string; featuredCities: string[]; sections: Record<string, boolean> };

export function SettingsEditor({ settings, rates, cities }: { settings: Record<string, unknown>; rates: { cityId: string | null; cityName: string; rates: ConstructionRates }[]; cities: { slug: string; name: string }[] }) {
  const [home, setHome] = useState(settings.homepage as Homepage);
  const [platform, setPlatform] = useState({ marla_sqft: settings.marla_sqft as number, listing_expiry_days: settings.listing_expiry_days as number, demo_mode: !!settings.demo_mode });
  const [featured, setFeatured] = useState(settings.featured_pricing as Record<string, number>);
  const [weights, setWeights] = useState(settings.investment_weights as Record<string, number>);
  const [fraud, setFraud] = useState(settings.fraud_thresholds as Record<string, number>);
  const [financing, setFinancing] = useState(JSON.stringify(settings.financing_products, null, 2));
  const [rateIdx, setRateIdx] = useState(0);
  const [rate, setRate] = useState<ConstructionRates>(rates[0].rates);
  const [jobs, setJobs] = useState<Record<string, unknown> | null>(null);
  const [jobsBusy, setJobsBusy] = useState(false);
  const Q: FinishingQuality[] = ["basic", "standard", "premium", "luxury"];
  const wSum = Object.values(weights).reduce((a, b) => a + Number(b), 0);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Section title="Homepage" desc="Hero copy, announcement banner, sections and featured cities.">
        <L t="Hero title"><input className={darkInput} value={home.heroTitle} onChange={(e) => setHome({ ...home, heroTitle: e.target.value })} /></L>
        <L t="Hero subtitle"><textarea className={darkInput} value={home.heroSubtitle} onChange={(e) => setHome({ ...home, heroSubtitle: e.target.value })} /></L>
        <L t="Announcement (blank to hide)"><input className={darkInput} value={home.announcement} onChange={(e) => setHome({ ...home, announcement: e.target.value })} /></L>
        <div className="flex flex-wrap gap-3 text-xs text-slate-300">
          {Object.keys(home.sections).map((k) => (
            <label key={k} className="flex items-center gap-1.5 capitalize"><input type="checkbox" className="accent-gold-500" checked={home.sections[k]} onChange={(e) => setHome({ ...home, sections: { ...home.sections, [k]: e.target.checked } })} /> {k}</label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-300">
          {cities.map((c) => (
            <label key={c.slug} className="flex items-center gap-1.5"><input type="checkbox" className="accent-gold-500" checked={home.featuredCities.includes(c.slug)} onChange={(e) => setHome({ ...home, featuredCities: e.target.checked ? [...home.featuredCities, c.slug] : home.featuredCities.filter((x) => x !== c.slug) })} /> {c.name}</label>
          ))}
        </div>
        <SaveBtn onSave={() => saveSetting("homepage", home)} />
      </Section>

      <Section title="Platform" desc="Units, listing lifetime and demo mode.">
        <div className="grid grid-cols-2 gap-3">
          <L t="Marla size (sq ft)"><input type="number" className={darkInput} value={platform.marla_sqft} onChange={(e) => setPlatform({ ...platform, marla_sqft: Number(e.target.value) })} /></L>
          <L t="Listing expiry (days)"><input type="number" className={darkInput} value={platform.listing_expiry_days} onChange={(e) => setPlatform({ ...platform, listing_expiry_days: Number(e.target.value) })} /></L>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" className="accent-gold-500" checked={platform.demo_mode} onChange={(e) => setPlatform({ ...platform, demo_mode: e.target.checked })} /> Demo mode (shows the demo-data banner and one-click demo logins)</label>
        <SaveBtn onSave={async () => { await saveSetting("marla_sqft", platform.marla_sqft); await saveSetting("listing_expiry_days", platform.listing_expiry_days); await saveSetting("demo_mode", platform.demo_mode); }} />
      </Section>

      <Section title="Construction material & labour rates" desc="Used by the construction cost calculator. Set a default and optional per-city overrides (PKR).">
        <select className={darkInput} value={rateIdx} onChange={(e) => { const i = Number(e.target.value); setRateIdx(i); setRate(rates[i].rates); }} aria-label="Rate set">
          {rates.map((r, i) => <option key={r.cityId ?? "default"} value={i}>{r.cityName}</option>)}
        </select>
        <div className="grid grid-cols-3 gap-3">
          <L t="Grey structure / sq ft"><input type="number" className={darkInput} value={rate.greyStructurePerSqft} onChange={(e) => setRate({ ...rate, greyStructurePerSqft: Number(e.target.value) })} /></L>
          <L t="Labour / sq ft"><input type="number" className={darkInput} value={rate.laborPerSqft} onChange={(e) => setRate({ ...rate, laborPerSqft: Number(e.target.value) })} /></L>
          <L t="City multiplier"><input type="number" step="0.01" className={darkInput} value={rate.cityMultiplier} onChange={(e) => setRate({ ...rate, cityMultiplier: Number(e.target.value) })} /></L>
        </div>
        <table className="w-full text-xs">
          <thead className="text-slate-400"><tr><th className="pb-1 text-left">Item</th>{Q.map((q) => <th key={q} className="pb-1 text-left capitalize">{q}</th>)}</tr></thead>
          <tbody>
            {([["finishingPerSqft", "Finishing / sq ft"], ["electricalPerSqft", "Electrical / sq ft"], ["plumbingPerSqft", "Plumbing / sq ft"], ["woodworkPerSqft", "Woodwork / sq ft"], ["kitchenPerUnit", "Kitchen (each)"], ["bathroomPerUnit", "Bathroom (each)"]] as [keyof ConstructionRates, string][]).map(([k, label]) => (
              <tr key={k}>
                <td className="py-1 pr-2 text-slate-300">{label}</td>
                {Q.map((q) => (
                  <td key={q} className="py-1 pr-2"><input type="number" className={`${darkInput} px-2 py-1`} value={(rate[k] as Record<FinishingQuality, number>)[q]} onChange={(e) => setRate({ ...rate, [k]: { ...(rate[k] as Record<FinishingQuality, number>), [q]: Number(e.target.value) } })} aria-label={`${label} ${q}`} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <L t="Rates effective date"><input type="date" className={darkInput} value={rate.effectiveDate} onChange={(e) => setRate({ ...rate, effectiveDate: e.target.value })} /></L>
        <SaveBtn onSave={() => api("/api/v1/admin/rates.set", { body: { cityId: rates[rateIdx].cityId, rates: rate } }).then(() => undefined)} />
      </Section>

      <Section title="Featured listing pricing (PKR)">
        <div className="grid grid-cols-3 gap-3">
          {Object.keys(featured).map((d) => <L key={d} t={`${d} days`}><input type="number" className={darkInput} value={featured[d]} onChange={(e) => setFeatured({ ...featured, [d]: Number(e.target.value) })} /></L>)}
        </div>
        <SaveBtn onSave={() => saveSetting("featured_pricing", featured)} />
      </Section>

      <Section title="Investment score weights" desc={`Used to rank opportunities on /invest. Weights should sum to 1 (currently ${wSum.toFixed(2)}).`}>
        <div className="grid grid-cols-2 gap-3">
          {Object.keys(weights).map((k) => <L key={k} t={k}><input type="number" step="0.05" min={0} max={1} className={darkInput} value={weights[k]} onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })} /></L>)}
        </div>
        <SaveBtn onSave={async () => { if (Math.abs(wSum - 1) > 0.01) throw new Error("Weights must add up to 1"); await saveSetting("investment_weights", weights); }} />
      </Section>

      <Section title="Fraud thresholds">
        <div className="grid grid-cols-3 gap-3">
          {Object.keys(fraud).map((k) => <L key={k} t={k}><input type="number" className={darkInput} value={fraud[k]} onChange={(e) => setFraud({ ...fraud, [k]: Number(e.target.value) })} /></L>)}
        </div>
        <SaveBtn onSave={() => saveSetting("fraud_thresholds", fraud)} />
      </Section>

      <Section title="Home financing products" desc="Conventional and Islamic products shown in the financing calculator (JSON array).">
        <textarea className={`${darkInput} min-h-64 font-mono text-xs`} value={financing} onChange={(e) => setFinancing(e.target.value)} />
        <SaveBtn onSave={async () => { let v: unknown; try { v = JSON.parse(financing); } catch { throw new Error("Invalid JSON"); } if (!Array.isArray(v)) throw new Error("Must be an array"); await saveSetting("financing_products", v); }} />
      </Section>

      <Section title="Background jobs" desc="Normally run by the worker every few minutes. Run a pass now: expire listings, saved-search digests, rent dues & reminders, campaign ends, outbox delivery.">
        <button className={darkBtn} disabled={jobsBusy} onClick={async () => { setJobsBusy(true); try { setJobs(await api("/api/v1/admin/jobs.run", { body: {} })); toast("Jobs complete"); } catch (e) { toast((e as Error).message, "error"); } finally { setJobsBusy(false); } }}>
          {jobsBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Run scheduled jobs now
        </button>
        {jobs && <pre className="overflow-x-auto rounded-xl bg-night-3 p-3 text-xs text-slate-300">{JSON.stringify(jobs, null, 2)}</pre>}
      </Section>
    </div>
  );
}
