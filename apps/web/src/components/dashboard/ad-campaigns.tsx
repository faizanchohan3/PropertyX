"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, MousePointerClick, Eye, Wallet } from "lucide-react";
import { AD_FORMATS, formatPKR } from "@propertyx/shared";
import { api, fieldError } from "@/lib/client";
import { Modal, FieldError, FormError } from "../modal";
import { StatusPill } from "../badges";
import { CheckoutButton } from "../checkout-button";
import { LocationAutocomplete } from "../location-autocomplete";
import { toast } from "../toast";

type Ad = { id: string; campaignName: string; format: string; title: string; status: string; budget: number; spent: number; impressions: number; clicks: number; startAt: string; endAt: string; paymentId: string | null; rejectionReason: string | null };
type Target = { type: string; id: string; label: string };
type Gateway = { key: string; name: string; description: string; methods: string[] };

export function AdCampaigns({ ads, targets, gateways }: { ads: Ad[]; targets: Target[]; gateways: Gateway[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
  const [f, setF] = useState({ campaignName: "", format: "featured_listing", target: targets[0] ? `${targets[0].type}:${targets[0].id}` : "brand:", title: "", body: "", linkUrl: "", budget: 25000, startAt: today, endAt: in30 });
  const [loc, setLoc] = useState<{ slug: string; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: k === "budget" ? Number(e.target.value) : e.target.value }));
  const create = async () => {
    setBusy(true);
    setErr(null);
    const [targetType, targetId] = f.target.split(":");
    try {
      await api("/api/v1/ads", { body: { ...f, targetType, targetId: targetId || null, linkUrl: f.linkUrl || null, body: f.body || null, locationSlug: loc?.slug ?? null, startAt: new Date(f.startAt).toISOString(), endAt: new Date(f.endAt + "T23:59:59").toISOString() } });
      toast("Campaign created — pay to submit it for approval");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setErr(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <button onClick={() => setOpen(true)} className="btn-gold mb-5">
        <Plus className="h-4 w-4" /> New campaign
      </button>
      {ads.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No campaigns yet. Promote a listing, project or your agency to reach more buyers.</p>
      ) : (
        <div className="space-y-3">
          {ads.map((a) => {
            const ctr = a.impressions ? ((a.clicks / a.impressions) * 100).toFixed(2) : "0.00";
            return (
              <div key={a.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusPill status={a.status} />
                      <span className="badge bg-slate-100 text-slate-600">{AD_FORMATS.find((x) => x.key === a.format)?.label}</span>
                    </div>
                    <p className="mt-1 font-bold">{a.campaignName}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(a.startAt).toLocaleDateString("en-PK")} – {new Date(a.endAt).toLocaleDateString("en-PK")}
                    </p>
                    {a.rejectionReason && a.status === "rejected" && <p className="mt-1 text-sm text-red-600">{a.rejectionReason}</p>}
                  </div>
                  {!a.paymentId && a.status === "draft" && <CheckoutButton purpose="advertising" referenceId={a.id} label={`Pay ${formatPKR(a.budget)} & submit`} className="btn-primary btn-sm" gateways={gateways} />}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="flex items-center gap-1 text-xs text-slate-500"><Eye className="h-3.5 w-3.5" /> Impressions</p>
                    <p className="font-bold">{a.impressions.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="flex items-center gap-1 text-xs text-slate-500"><MousePointerClick className="h-3.5 w-3.5" /> Clicks</p>
                    <p className="font-bold">{a.clicks.toLocaleString()}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">CTR</p>
                    <p className="font-bold">{ctr}%</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="flex items-center gap-1 text-xs text-slate-500"><Wallet className="h-3.5 w-3.5" /> Spent / budget</p>
                    <p className="font-bold">
                      {formatPKR(a.spent)} / {formatPKR(a.budget)}
                    </p>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-200">
                      <div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${Math.min(100, (a.spent / Math.max(1, a.budget)) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="New advertising campaign" wide>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="ad-name">Campaign name</label>
              <input id="ad-name" className="input" value={f.campaignName} onChange={set("campaignName")} />
              <FieldError msg={fieldError(err, "campaignName")} />
            </div>
            <div>
              <label className="label" htmlFor="ad-format">Placement</label>
              <select id="ad-format" className="input" value={f.format} onChange={set("format")}>
                {AD_FORMATS.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="ad-target">Promote</label>
            <select id="ad-target" className="input" value={f.target} onChange={set("target")}>
              {targets.map((t) => (
                <option key={`${t.type}:${t.id}`} value={`${t.type}:${t.id}`}>
                  {t.label}
                </option>
              ))}
              <option value="brand:">My brand (custom link)</option>
            </select>
          </div>
          {f.format === "area_sponsorship" && (
            <div>
              <span className="label">Area to sponsor</span>
              <LocationAutocomplete value={loc} onSelect={(s) => setLoc(s ? { slug: s.slug, label: s.name } : null)} />
            </div>
          )}
          <div>
            <label className="label" htmlFor="ad-title">Headline</label>
            <input id="ad-title" className="input" maxLength={100} value={f.title} onChange={set("title")} />
            <FieldError msg={fieldError(err, "title")} />
          </div>
          <div>
            <label className="label" htmlFor="ad-body">Short text</label>
            <textarea id="ad-body" className="input" maxLength={200} value={f.body} onChange={set("body")} />
          </div>
          <div>
            <label className="label" htmlFor="ad-link">Link (a PropertyX path like /project/... or an https:// URL)</label>
            <input id="ad-link" className="input" value={f.linkUrl} onChange={set("linkUrl")} />
            <FieldError msg={fieldError(err, "linkUrl")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="ad-budget">Budget (PKR)</label>
              <input id="ad-budget" type="number" min={5000} step={1000} className="input" value={f.budget} onChange={set("budget")} />
              <FieldError msg={fieldError(err, "budget")} />
            </div>
            <div>
              <label className="label" htmlFor="ad-start">Start</label>
              <input id="ad-start" type="date" className="input" min={today} value={f.startAt} onChange={set("startAt")} />
            </div>
            <div>
              <label className="label" htmlFor="ad-end">End</label>
              <input id="ad-end" type="date" className="input" min={f.startAt} value={f.endAt} onChange={set("endAt")} />
            </div>
          </div>
          <p className="text-xs text-slate-500">Billed per 1,000 impressions against your budget. Campaigns are reviewed by our team before they go live.</p>
          <FormError msg={err instanceof Error ? err.message : null} />
          <button onClick={create} disabled={busy} className="btn-primary w-full">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create campaign
          </button>
        </div>
      </Modal>
    </div>
  );
}
