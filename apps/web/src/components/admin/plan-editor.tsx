"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/client";
import { toast } from "../toast";
import { darkInput, okBtn } from "./ui";

type Plan = { id: string; key: string; name: string; priceMonthly: number; priceYearly: number; listingQuota: number; featuredQuota: number; agentSeats: number; isActive: boolean; features: string[] };

export function PlanEditor({ plan }: { plan: Plan }) {
  const router = useRouter();
  const [p, setP] = useState(plan);
  const [busy, setBusy] = useState(false);
  const num = (k: keyof Plan) => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: Number(e.target.value) });
  return (
    <div className="dark-panel space-y-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <input className={`${darkInput} font-bold`} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} aria-label="Plan name" />
        <label className="flex shrink-0 items-center gap-1.5 text-xs text-slate-300">
          <input type="checkbox" checked={p.isActive} onChange={(e) => setP({ ...p, isActive: e.target.checked })} className="accent-gold-500" /> Active
        </label>
      </div>
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{p.key}</p>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
        {(
          [
            ["priceMonthly", "Monthly (PKR)"],
            ["priceYearly", "Yearly (PKR)"],
            ["listingQuota", "Listing quota"],
            ["featuredQuota", "Featured / month"],
            ["agentSeats", "Agent seats"],
          ] as [keyof Plan, string][]
        ).map(([k, l]) => (
          <label key={k} className="space-y-1">
            <span>{l}</span>
            <input type="number" min={0} className={darkInput} value={p[k] as number} onChange={num(k)} />
          </label>
        ))}
      </div>
      <label className="block space-y-1 text-xs text-slate-400">
        <span>Features (one per line)</span>
        <textarea className={`${darkInput} min-h-24`} value={p.features.join("\n")} onChange={(e) => setP({ ...p, features: e.target.value.split("\n").filter(Boolean) })} />
      </label>
      <button
        className={okBtn}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const { id, key: _k, ...patch } = p;
            await api("/api/v1/admin/plan.update", { body: { id, patch } });
            toast(`${p.name} saved`);
            router.refresh();
          } catch (e) {
            toast((e as Error).message, "error");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save plan
      </button>
    </div>
  );
}
