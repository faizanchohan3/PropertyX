"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Trash2, ExternalLink } from "lucide-react";
import { serializeSearchQuery, type SearchQuery } from "@propertyx/shared";
import { api } from "@/lib/client";
import { toast } from "./toast";

type SS = { id: string; name: string; query: Record<string, unknown>; frequency: string; isActive: boolean; total: number; newCount: number; matchCount: number; lastNotifiedAt: string | null };

export function SavedSearchesList({ items }: { items: SS[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const patch = async (id: string, body: Record<string, unknown>, msg: string) => {
    setBusy(id);
    try {
      await api(`/api/v1/saved-searches/${id}`, { method: "PATCH", body });
      toast(msg);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this saved search?")) return;
    setBusy(id);
    await api(`/api/v1/saved-searches/${id}`, { method: "DELETE" }).catch(() => {});
    toast("Deleted");
    router.refresh();
  };
  return (
    <ul className="space-y-3">
      {items.map((s) => {
        const href = `/search?${serializeSearchQuery(s.query as SearchQuery).toString()}`;
        return (
          <li key={s.id} className={`card flex flex-wrap items-center gap-4 p-5 ${s.isActive ? "" : "opacity-60"}`}>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900">{s.name}</p>
              <p className="text-sm text-slate-500">
                {s.total.toLocaleString()} matching now
                {s.newCount > 0 && <span className="ml-2 badge bg-brand-700 text-white">{s.newCount} new</span>}
                {s.lastNotifiedAt && ` · last alert ${new Date(s.lastNotifiedAt).toLocaleDateString("en-PK")}`}
              </p>
            </div>
            <select aria-label="Alert frequency" disabled={busy === s.id} className="input w-auto py-2 text-sm" value={s.frequency} onChange={(e) => patch(s.id, { frequency: e.target.value }, "Alert frequency updated")}>
              <option value="instant">Instant alerts</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
            </select>
            <button disabled={busy === s.id} onClick={() => patch(s.id, { isActive: !s.isActive }, s.isActive ? "Alerts paused" : "Alerts on")} className="btn-outline btn-sm" title={s.isActive ? "Pause alerts" : "Resume alerts"}>
              {s.isActive ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </button>
            <Link href={href} onClick={() => api(`/api/v1/saved-searches/${s.id}`, { method: "PATCH", body: { markChecked: true } }).catch(() => {})} className="btn-primary btn-sm">
              <ExternalLink className="h-4 w-4" /> View results
            </Link>
            <button disabled={busy === s.id} onClick={() => remove(s.id)} className="btn-ghost btn-sm text-red-600" aria-label="Delete saved search">
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
