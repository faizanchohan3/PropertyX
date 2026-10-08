"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronDown } from "lucide-react";
import { api } from "@/lib/client";
import { toast } from "../toast";
import { darkInput, okBtn } from "./ui";

type Loc = { id: string; kind: string; name: string; fullName: string; slug: string; activeListings: number; overview: string; investmentOutlook: string; highlights: string[]; seoTitle: string; seoDescription: string; guide: { title: string; summary: string; body: string; pros: string[]; cons: string[] } | null };

export function LocationEditor({ loc }: { loc: Loc }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(loc);
  const [g, setG] = useState(loc.guide ?? { title: `Living in ${loc.name}`, summary: "", body: "", pros: [], cons: [] });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api("/api/v1/admin/location.save", { body: { id: f.id, overview: f.overview || null, investmentOutlook: f.investmentOutlook || null, highlights: f.highlights.filter(Boolean), seoTitle: f.seoTitle || null, seoDescription: f.seoDescription || null, guide: g.body.trim() ? g : null } });
      toast(`${loc.name} saved`);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const field = (label: string, el: React.ReactNode) => (
    <label className="block space-y-1 text-xs text-slate-400">
      <span>{label}</span>
      {el}
    </label>
  );
  return (
    <div className="dark-panel">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="badge bg-white/10 capitalize text-slate-300">{loc.kind}</span>
        <span className="flex-1">
          <span className="font-semibold text-white">{loc.name}</span> <span className="text-xs text-slate-500">/area/{loc.slug}</span>
        </span>
        <span className="text-xs text-slate-400">{loc.activeListings} listings</span>
        {loc.guide && <span className="badge bg-emerald-500/15 text-emerald-300">guide</span>}
        <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-white/10 p-4">
          {field("Overview (shown at the top of the area page)", <textarea className={`${darkInput} min-h-20`} value={f.overview} onChange={(e) => setF({ ...f, overview: e.target.value })} />)}
          {field("Investment outlook (editorial — avoid unverifiable claims)", <textarea className={`${darkInput} min-h-16`} value={f.investmentOutlook} onChange={(e) => setF({ ...f, investmentOutlook: e.target.value })} />)}
          {field("Highlights (one per line)", <textarea className={`${darkInput} min-h-16`} value={f.highlights.join("\n")} onChange={(e) => setF({ ...f, highlights: e.target.value.split("\n") })} />)}
          <div className="grid gap-3 md:grid-cols-2">
            {field("SEO title", <input className={darkInput} maxLength={70} value={f.seoTitle} onChange={(e) => setF({ ...f, seoTitle: e.target.value })} />)}
            {field("Meta description", <input className={darkInput} maxLength={170} value={f.seoDescription} onChange={(e) => setF({ ...f, seoDescription: e.target.value })} />)}
          </div>
          <p className="pt-2 text-sm font-semibold text-white">Area guide</p>
          <div className="grid gap-3 md:grid-cols-2">
            {field("Guide title", <input className={darkInput} value={g.title} onChange={(e) => setG({ ...g, title: e.target.value })} />)}
            {field("Summary", <input className={darkInput} value={g.summary} onChange={(e) => setG({ ...g, summary: e.target.value })} />)}
          </div>
          {field("Guide body", <textarea className={`${darkInput} min-h-28`} value={g.body} onChange={(e) => setG({ ...g, body: e.target.value })} />)}
          <div className="grid gap-3 md:grid-cols-2">
            {field("Pros (one per line)", <textarea className={`${darkInput} min-h-16`} value={g.pros.join("\n")} onChange={(e) => setG({ ...g, pros: e.target.value.split("\n").filter(Boolean) })} />)}
            {field("Cons (one per line)", <textarea className={`${darkInput} min-h-16`} value={g.cons.join("\n")} onChange={(e) => setG({ ...g, cons: e.target.value.split("\n").filter(Boolean) })} />)}
          </div>
          <button onClick={save} disabled={busy} className={okBtn}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save {loc.name}
          </button>
        </div>
      )}
    </div>
  );
}

export function AddLocationForm({ cities }: { cities: { id: string; name: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="dark-panel grid gap-3 p-4 md:grid-cols-6"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
        setBusy(true);
        try {
          await api("/api/v1/admin/location.add", { body: fd });
          toast("Location added");
          (e.target as HTMLFormElement).reset();
          router.refresh();
        } catch (err) {
          toast((err as Error).message, "error");
        } finally {
          setBusy(false);
        }
      }}
    >
      <select name="kind" className={darkInput} aria-label="Kind">
        <option value="society">Housing society</option>
        <option value="area">Area / neighbourhood</option>
        <option value="block">Block / phase</option>
      </select>
      <select name="cityId" className={darkInput} aria-label="City" required>
        {cities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input name="name" className={darkInput} placeholder="Name" required />
      <input name="parentSlug" className={darkInput} placeholder="Parent slug (blocks only)" />
      <div className="flex gap-2">
        <input name="lat" className={darkInput} placeholder="Lat" required inputMode="decimal" />
        <input name="lng" className={darkInput} placeholder="Lng" required inputMode="decimal" />
      </div>
      <button className={okBtn} disabled={busy}>
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Add location
      </button>
    </form>
  );
}
