"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { api, fieldError } from "@/lib/client";
import { FieldError, FormError } from "../modal";
import { LocationAutocomplete } from "../location-autocomplete";
import { toast } from "../toast";

const SPECS = ["Residential Sales", "Rentals", "Plots & Files", "Commercial", "Overseas Clients", "New Projects", "Luxury Homes", "Farmhouses", "Installment Deals", "Property Management"];
const LANGS = ["Urdu", "English", "Punjabi", "Pashto", "Sindhi", "Saraiki", "Balochi"];

export function AgentProfileForm({ initial }: { initial: { displayName: string; bio: string; experienceYears: number | null; phone: string; whatsapp: string; specializations: string[]; languages: string[]; areas: { slug: string; name: string }[] } }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const toggle = (k: "specializations" | "languages", v: string) => setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api("/api/v1/agents/me", { method: "PUT", body: { ...f, areaSlugs: f.areas.map((a) => a.slug) } });
      toast("Agent profile saved");
      router.refresh();
    } catch (e) {
      setErr(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="ap-name">Display name</label>
          <input id="ap-name" className="input" value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} />
          <FieldError msg={fieldError(err, "displayName")} />
        </div>
        <div>
          <label className="label" htmlFor="ap-exp">Years of experience</label>
          <input id="ap-exp" type="number" min={0} max={60} className="input" value={f.experienceYears ?? ""} onChange={(e) => setF({ ...f, experienceYears: e.target.value ? Number(e.target.value) : null })} />
        </div>
        <div>
          <label className="label" htmlFor="ap-phone">Phone</label>
          <input id="ap-phone" className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <FieldError msg={fieldError(err, "phone")} />
        </div>
        <div>
          <label className="label" htmlFor="ap-wa">WhatsApp</label>
          <input id="ap-wa" className="input" value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} />
          <FieldError msg={fieldError(err, "whatsapp")} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="ap-bio">About you</label>
        <textarea id="ap-bio" className="input min-h-28" maxLength={2000} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />
      </div>
      <div>
        <span className="label">Specialisations</span>
        <div className="flex flex-wrap gap-2">
          {SPECS.map((s) => (
            <button key={s} type="button" onClick={() => toggle("specializations", s)} className={`chip text-xs ${f.specializations.includes(s) ? "chip-active" : ""}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="label">Languages</span>
        <div className="flex flex-wrap gap-2">
          {LANGS.map((s) => (
            <button key={s} type="button" onClick={() => toggle("languages", s)} className={`chip text-xs ${f.languages.includes(s) ? "chip-active" : ""}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="label">Areas covered (up to 10)</span>
        <div className="mb-2 flex flex-wrap gap-2">
          {f.areas.map((a) => (
            <span key={a.slug} className="chip chip-active text-xs">
              {a.name}
              <button type="button" onClick={() => setF({ ...f, areas: f.areas.filter((x) => x.slug !== a.slug) })} aria-label={`Remove ${a.name}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        {f.areas.length < 10 && <LocationAutocomplete value={null} placeholder="Add an area or society" onSelect={(s) => s && !f.areas.some((a) => a.slug === s.slug) && setF({ ...f, areas: [...f.areas, { slug: s.slug, name: s.name }] })} />}
      </div>
      <FormError msg={err instanceof Error ? err.message : null} />
      <button onClick={save} disabled={busy} className="btn-primary">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save agent profile
      </button>
    </div>
  );
}

type OrgFields = { name: string; description: string; phone: string; website: string; email: string; establishedYear: number | null; whatsapp?: string; address?: string };

export function OrgForm({ kind, initial, exists }: { kind: "agency" | "developer"; initial: OrgFields; exists: boolean }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const url = kind === "agency" ? "/api/v1/agency" : "/api/v1/developers/me";
  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api(url, { method: exists ? "PATCH" : "POST", body: { ...f, establishedYear: f.establishedYear || null } });
      toast(exists ? "Saved" : `${kind === "agency" ? "Agency" : "Developer profile"} created`);
      router.refresh();
    } catch (e) {
      setErr(e);
    } finally {
      setBusy(false);
    }
  };
  const field = (k: keyof OrgFields, label: string, type = "text") => (
    <div>
      <label className="label" htmlFor={`${kind}-${k}`}>{label}</label>
      <input id={`${kind}-${k}`} type={type} className="input" value={(f[k] as string | number | null) ?? ""} onChange={(e) => setF({ ...f, [k]: type === "number" ? (e.target.value ? Number(e.target.value) : null) : e.target.value })} />
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {field("name", kind === "agency" ? "Agency name" : "Company name")}
        {exists && field("establishedYear", "Established (year)", "number")}
        {field("phone", "Phone")}
        {exists && field("email", "Email", "email")}
        {exists && field("website", "Website")}
        {exists && kind === "agency" && field("address", "Office address")}
      </div>
      <div>
        <label className="label" htmlFor={`${kind}-desc`}>About</label>
        <textarea id={`${kind}-desc`} className="input min-h-24" maxLength={4000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      </div>
      <FormError msg={err instanceof Error ? err.message : null} />
      <button onClick={save} disabled={busy} className="btn-primary">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} {exists ? "Save" : `Create ${kind === "agency" ? "agency" : "developer profile"}`}
      </button>
    </div>
  );
}
