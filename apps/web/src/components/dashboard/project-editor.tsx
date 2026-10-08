"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Upload, X } from "lucide-react";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, UNIT_TYPES, formatPKR, calculateInstallmentPlan } from "@propertyx/shared";
import { api, ApiError } from "@/lib/client";
import { LocationAutocomplete } from "../location-autocomplete";
import { FormError } from "../modal";
import { toast } from "../toast";

type Unit = { type: string; name: string; areaSqft: number | ""; beds: number | ""; baths: number | ""; priceFrom: number | ""; priceTo: number | ""; totalUnits: number | ""; availableUnits: number | "" };
type Plan = { name: string; downPaymentPct: number | ""; durationMonths: number | ""; frequency: "monthly" | "quarterly"; possessionPct: number | ""; balloonPct: number | ""; notes: string };
export type ProjectForm = {
  name: string;
  tagline: string;
  description: string;
  cityId: string;
  locationSlug: string | null;
  locationLabel: string;
  address: string;
  status: string;
  constructionProgress: number;
  launchDate: string;
  expectedCompletion: string;
  amenities: string[];
  gallery: string[];
  videoUrl: string;
  brochureUrl: string;
  units: Unit[];
  plans: Plan[];
};

const AMENITIES = ["24/7 Security", "CCTV Surveillance", "Backup Power", "Underground Parking", "Elevators", "Mosque", "Gym", "Community Hall", "Swimming Pool", "Kids Play Area", "Park", "Gated Entry", "Clubhouse", "Commercial Area", "School Site", "Water Filtration Plant", "Underground Electricity", "Food Court", "Conference Facility"];

export function ProjectEditor({ initial, projectId, cities }: { initial: ProjectForm; projectId?: string; cities: { id: string; name: string }[] }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const set = <K extends keyof ProjectForm>(k: K, v: ProjectForm[K]) => setF((x) => ({ ...x, [k]: v }));
  const setUnit = (i: number, patch: Partial<Unit>) => set("units", f.units.map((u, j) => (j === i ? { ...u, ...patch } : u)));
  const setPlan = (i: number, patch: Partial<Plan>) => set("plans", f.plans.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const n = (v: string) => (v === "" ? "" : Number(v));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const urls: string[] = [];
    for (const fl of [...files].slice(0, 20)) {
      const form = new FormData();
      form.append("file", fl);
      form.append("folder", "projects");
      try {
        urls.push((await api<{ url: string }>("/api/v1/uploads/image", { form })).url);
      } catch (e) {
        toast(`${fl.name}: ${(e as Error).message}`, "error");
      }
    }
    set("gallery", [...f.gallery, ...urls]);
    setUploading(false);
  };

  const save = async () => {
    setBusy(true);
    setErr(null);
    const payload = {
      ...f,
      launchDate: f.launchDate || null,
      expectedCompletion: f.expectedCompletion || null,
      videoUrl: f.videoUrl || null,
      brochureUrl: f.brochureUrl || null,
      coverImage: f.gallery[0] ?? null,
      units: f.units.map((u) => ({ ...u, beds: u.beds === "" ? null : u.beds, baths: u.baths === "" ? null : u.baths, priceTo: u.priceTo === "" ? null : u.priceTo })),
      plans: f.plans.map((p) => ({ ...p, possessionPct: p.possessionPct || 0, balloonPct: p.balloonPct || 0, notes: p.notes || null })),
    };
    try {
      const r = projectId ? await api<{ id: string }>(`/api/v1/projects/${projectId}`, { method: "PUT", body: payload }) : await api<{ id: string }>("/api/v1/projects", { body: payload });
      toast(projectId ? "Project updated" : "Project submitted for review");
      router.push(`/dashboard/projects?saved=${r.id}`);
      router.refresh();
    } catch (e) {
      const fe = e instanceof ApiError ? e.details?.fieldErrors : undefined;
      setErr(fe ? `${(e as Error).message}: ${Object.entries(fe).map(([k, v]) => `${k} — ${v[0]}`).join("; ")}` : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="card space-y-4 p-6">
        <h2 className="font-bold">Project details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="p-name">Project name</label>
            <input id="p-name" className="input" value={f.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="p-tag">Tagline</label>
            <input id="p-tag" className="input" maxLength={160} value={f.tagline} onChange={(e) => set("tagline", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="p-desc">Description</label>
          <textarea id="p-desc" className="input min-h-32" value={f.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="p-city">City</label>
            <select id="p-city" className="input" value={f.cityId} onChange={(e) => set("cityId", e.target.value)}>
              <option value="">Select</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <span className="label">Area / society</span>
            <LocationAutocomplete value={f.locationSlug ? { slug: f.locationSlug, label: f.locationLabel } : null} onSelect={(s) => setF((x) => ({ ...x, locationSlug: s?.slug ?? null, locationLabel: s?.name ?? "" }))} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="p-addr">Address</label>
          <input id="p-addr" className="input" value={f.address} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className="label" htmlFor="p-status">Status</label>
            <select id="p-status" className="input" value={f.status} onChange={(e) => set("status", e.target.value)}>
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="p-prog">Construction progress: {f.constructionProgress}%</label>
            <input id="p-prog" type="range" min={0} max={100} step={5} value={f.constructionProgress} onChange={(e) => set("constructionProgress", Number(e.target.value))} className="w-full accent-brand-700" />
          </div>
          <div>
            <label className="label" htmlFor="p-launch">Launch date</label>
            <input id="p-launch" type="date" className="input" value={f.launchDate} onChange={(e) => set("launchDate", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="p-done">Expected completion</label>
            <input id="p-done" type="date" className="input" value={f.expectedCompletion} onChange={(e) => set("expectedCompletion", e.target.value)} />
          </div>
        </div>
        <div>
          <span className="label">Amenities</span>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((a) => (
              <button key={a} type="button" onClick={() => set("amenities", f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a])} className={`chip text-xs ${f.amenities.includes(a) ? "chip-active" : ""}`}>
                {a}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Gallery & media</h2>
          <button onClick={() => file.current?.click()} className="btn-outline btn-sm" disabled={uploading}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload images
          </button>
          <input ref={file} type="file" multiple hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => upload(e.target.files)} />
        </div>
        {f.gallery.length === 0 ? (
          <p className="text-sm text-slate-500">Add renders, site photos and the master plan. The first image is the cover.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {f.gallery.map((g, i) => (
              <div key={g + i} className="relative overflow-hidden rounded-lg">
                <img src={g} alt="" className="aspect-[4/3] w-full object-cover" />
                {i === 0 && <span className="badge absolute left-1 top-1 bg-brand-700 text-white">Cover</span>}
                <button onClick={() => set("gallery", f.gallery.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-white/90 p-1" aria-label="Remove image">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="p-video">Video URL</label>
            <input id="p-video" className="input" placeholder="https://www.youtube.com/embed/…" value={f.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="p-broch">Brochure URL (PDF)</label>
            <input id="p-broch" className="input" placeholder="https://…" value={f.brochureUrl} onChange={(e) => set("brochureUrl", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Unit types & inventory</h2>
          <button onClick={() => set("units", [...f.units, { type: "apartment", name: "", areaSqft: "", beds: "", baths: "", priceFrom: "", priceTo: "", totalUnits: "", availableUnits: "" }])} className="btn-outline btn-sm">
            <Plus className="h-3.5 w-3.5" /> Add unit type
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>{["Type", "Name", "Area (sq ft)", "Beds", "Baths", "Price from", "Price to", "Total", "Available", ""].map((h) => <th key={h} className="pb-2 pr-2 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {f.units.map((u, i) => (
                <tr key={i}>
                  <td className="pb-2 pr-2">
                    <select aria-label="Unit type" className="input py-2" value={u.type} onChange={(e) => setUnit(i, { type: e.target.value })}>
                      {UNIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="pb-2 pr-2"><input aria-label="Unit name" className="input py-2" value={u.name} onChange={(e) => setUnit(i, { name: e.target.value })} /></td>
                  <td className="pb-2 pr-2"><input aria-label="Area" className="input py-2" inputMode="numeric" value={u.areaSqft} onChange={(e) => setUnit(i, { areaSqft: n(e.target.value) })} /></td>
                  <td className="pb-2 pr-2"><input aria-label="Beds" className="input w-16 py-2" inputMode="numeric" value={u.beds} onChange={(e) => setUnit(i, { beds: n(e.target.value) })} /></td>
                  <td className="pb-2 pr-2"><input aria-label="Baths" className="input w-16 py-2" inputMode="numeric" value={u.baths} onChange={(e) => setUnit(i, { baths: n(e.target.value) })} /></td>
                  <td className="pb-2 pr-2"><input aria-label="Price from" className="input py-2" inputMode="numeric" value={u.priceFrom} onChange={(e) => setUnit(i, { priceFrom: n(e.target.value) })} /><span className="text-[10px] text-slate-400">{u.priceFrom ? formatPKR(Number(u.priceFrom)) : ""}</span></td>
                  <td className="pb-2 pr-2"><input aria-label="Price to" className="input py-2" inputMode="numeric" value={u.priceTo} onChange={(e) => setUnit(i, { priceTo: n(e.target.value) })} /></td>
                  <td className="pb-2 pr-2"><input aria-label="Total units" className="input w-20 py-2" inputMode="numeric" value={u.totalUnits} onChange={(e) => setUnit(i, { totalUnits: n(e.target.value) })} /></td>
                  <td className="pb-2 pr-2"><input aria-label="Available units" className="input w-20 py-2" inputMode="numeric" value={u.availableUnits} onChange={(e) => setUnit(i, { availableUnits: n(e.target.value) })} /></td>
                  <td className="pb-2"><button onClick={() => set("units", f.units.filter((_, j) => j !== i))} className="p-2 text-red-600" aria-label="Remove unit"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Payment plans</h2>
          <button onClick={() => set("plans", [...f.plans, { name: "", downPaymentPct: 20, durationMonths: 36, frequency: "monthly", possessionPct: 10, balloonPct: 0, notes: "" }])} className="btn-outline btn-sm">
            <Plus className="h-3.5 w-3.5" /> Add plan
          </button>
        </div>
        {f.plans.map((p, i) => {
          const sample = f.units[0]?.priceFrom ? Number(f.units[0].priceFrom) : 10_000_000;
          const months = Number(p.durationMonths) || 1;
          const down = (sample * (Number(p.downPaymentPct) || 0)) / 100;
          const possession = (sample * (Number(p.possessionPct) || 0)) / 100;
          const balloon = (sample * (Number(p.balloonPct) || 0)) / 100;
          const preview = calculateInstallmentPlan({ totalPrice: sample, downPayment: down, durationMonths: months, balloonPayment: possession + balloon, balloonMonth: months, quarterlyInstallment: undefined });
          return (
            <div key={i} className="rounded-2xl bg-slate-50 p-4">
              <div className="grid gap-3 sm:grid-cols-6">
                <div className="sm:col-span-2"><label className="label text-xs" htmlFor={`pl-n-${i}`}>Plan name</label><input id={`pl-n-${i}`} className="input" value={p.name} onChange={(e) => setPlan(i, { name: e.target.value })} /></div>
                <div><label className="label text-xs" htmlFor={`pl-d-${i}`}>Down %</label><input id={`pl-d-${i}`} className="input" inputMode="decimal" value={p.downPaymentPct} onChange={(e) => setPlan(i, { downPaymentPct: n(e.target.value) })} /></div>
                <div><label className="label text-xs" htmlFor={`pl-m-${i}`}>Months</label><input id={`pl-m-${i}`} className="input" inputMode="numeric" value={p.durationMonths} onChange={(e) => setPlan(i, { durationMonths: n(e.target.value) })} /></div>
                <div><label className="label text-xs" htmlFor={`pl-p-${i}`}>Possession %</label><input id={`pl-p-${i}`} className="input" inputMode="decimal" value={p.possessionPct} onChange={(e) => setPlan(i, { possessionPct: n(e.target.value) })} /></div>
                <div><label className="label text-xs" htmlFor={`pl-f-${i}`}>Frequency</label><select id={`pl-f-${i}`} className="input" value={p.frequency} onChange={(e) => setPlan(i, { frequency: e.target.value as "monthly" })}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></select></div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <span>
                  On a {formatPKR(sample)} unit: {formatPKR(down)} down, then {p.frequency === "quarterly" ? `${formatPKR(preview.monthlyInstallment * 3)} per quarter` : `${formatPKR(preview.monthlyInstallment)} per month`}, {formatPKR(possession + balloon)} on possession.
                </span>
                <button onClick={() => set("plans", f.plans.filter((_, j) => j !== i))} className="text-red-600">Remove plan</button>
              </div>
            </div>
          );
        })}
      </section>

      {err && <FormError msg={err} />}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {projectId ? "Save changes" : "Submit project for review"}
        </button>
      </div>
    </div>
  );
}
