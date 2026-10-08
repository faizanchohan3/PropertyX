"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Phone, Users, Check, X, Ban, UserX, CheckCheck } from "lucide-react";
import { api } from "@/lib/client";
import { StatusPill } from "../badges";
import { toast } from "../toast";

type Visit = { id: string; status: string; scheduledAt: string; visitors: number; phone: string | null; message: string; responseNote: string | null; isHost: boolean; title: string; link: string | null; address: string | null; requesterName: string; hostName: string };

export function VisitsList({ visits }: { visits: Visit[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (id: string, status: string, ask?: string) => {
    const note = ask ? prompt(ask) ?? undefined : undefined;
    if (ask && note === undefined) return;
    setBusy(id);
    try {
      await api(`/api/v1/appointments/${id}`, { method: "PATCH", body: { status, note: note || undefined } });
      toast("Visit updated");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  };
  if (!visits.length) return <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No visits here.</p>;
  const past = (v: Visit) => new Date(v.scheduledAt) < new Date();
  return (
    <ul className="space-y-3">
      {visits.map((v) => {
        const d = new Date(v.scheduledAt);
        return (
          <li key={v.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-50 text-brand-800">
              <span className="text-[11px] font-bold uppercase">{d.toLocaleDateString("en-PK", { month: "short", timeZone: "Asia/Karachi" })}</span>
              <span className="text-2xl font-extrabold leading-none">{d.toLocaleDateString("en-PK", { day: "numeric", timeZone: "Asia/Karachi" })}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={v.status} />
                <span className="text-sm font-semibold text-slate-700">{d.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Karachi" })}</span>
                <span className="badge bg-slate-100 text-slate-600">{v.isHost ? "You're hosting" : "Your visit"}</span>
              </div>
              <p className="mt-1 truncate font-semibold">{v.link ? <Link href={v.link} className="hover:text-brand-700">{v.title}</Link> : v.title}</p>
              <p className="flex flex-wrap gap-x-4 text-sm text-slate-500">
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {v.isHost ? v.requesterName : v.hostName} · {v.visitors} visitor{v.visitors > 1 ? "s" : ""}</span>
                {v.isHost && v.phone && <a href={`tel:${v.phone}`} className="flex items-center gap-1 hover:text-brand-700"><Phone className="h-3.5 w-3.5" /> {v.phone.replace("+92", "0")}</a>}
              </p>
              {v.message && <p className="mt-1 text-sm text-slate-600">“{v.message}”</p>}
              {v.responseNote && <p className="mt-1 text-xs text-slate-500">Note: {v.responseNote}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {v.isHost && v.status === "requested" && (
                <>
                  <button disabled={busy === v.id} onClick={() => act(v.id, "confirmed")} className="btn-primary btn-sm"><Check className="h-3.5 w-3.5" /> Confirm</button>
                  <button disabled={busy === v.id} onClick={() => act(v.id, "rejected", "Reason or a suggested time (optional)")} className="btn-outline btn-sm"><X className="h-3.5 w-3.5" /> Decline</button>
                </>
              )}
              {v.isHost && v.status === "confirmed" && past(v) && (
                <>
                  <button disabled={busy === v.id} onClick={() => act(v.id, "completed")} className="btn-primary btn-sm"><CheckCheck className="h-3.5 w-3.5" /> Completed</button>
                  <button disabled={busy === v.id} onClick={() => act(v.id, "no_show")} className="btn-outline btn-sm"><UserX className="h-3.5 w-3.5" /> No-show</button>
                </>
              )}
              {["requested", "confirmed"].includes(v.status) && !past(v) && (
                <button disabled={busy === v.id} onClick={() => act(v.id, "cancelled", "Reason for cancelling (optional)")} className="btn-ghost btn-sm text-red-600"><Ban className="h-3.5 w-3.5" /> Cancel</button>
              )}
              {["requested", "confirmed"].includes(v.status) && (
                <a href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Property visit: ${v.title}`)}&dates=${d.toISOString().replace(/[-:]|\.\d{3}/g, "")}/${new Date(d.getTime() + 45 * 60000).toISOString().replace(/[-:]|\.\d{3}/g, "")}&details=${encodeURIComponent(v.message)}&location=${encodeURIComponent(v.address ?? "")}`} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">
                  <CalendarDays className="h-3.5 w-3.5" /> Google Calendar
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
