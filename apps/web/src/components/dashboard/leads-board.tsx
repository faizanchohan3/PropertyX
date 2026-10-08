"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Phone, MessageCircle, Mail, Star, Search, Flame, StickyNote, Loader2, UserPlus } from "lucide-react";
import { LEAD_STATUSES, formatPKR } from "@propertyx/shared";
import { api } from "@/lib/client";
import { StatusPill } from "../badges";
import { toast } from "../toast";
import { Modal } from "../modal";

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string;
  source: string;
  status: string;
  offerAmount: number | null;
  aiScore: number | null;
  aiSummary: string | null;
  notes: string;
  isSaved: boolean;
  createdAt: string;
  listingTitle: string | null;
  listingSlug: string | null;
  listingPrice: number | null;
  projectName: string | null;
  projectSlug: string | null;
  recipientName: string | null;
};

const LABELS: Record<string, string> = { new: "New", contacted: "Contacted", qualified: "Qualified", negotiation: "Negotiation", won: "Won", lost: "Lost" };

export function LeadsBoard({ leads: initial, team, members = [] }: { leads: Lead[]; team: boolean; members?: { id: string; name: string }[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState(initial);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [savedOnly, setSavedOnly] = useState(false);
  const [noteFor, setNoteFor] = useState<Lead | null>(null);
  const [assignFor, setAssignFor] = useState<Lead | null>(null);
  const [busy, setBusy] = useState(false);
  const shown = useMemo(
    () => leads.filter((l) => (filter === "all" || l.status === filter) && (!savedOnly || l.isSaved) && (!q || `${l.name} ${l.phone} ${l.listingTitle ?? ""} ${l.projectName ?? ""}`.toLowerCase().includes(q.toLowerCase()))),
    [leads, filter, q, savedOnly],
  );
  const patch = async (id: string, body: Record<string, unknown>, msg?: string) => {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...body } : l)));
    try {
      await api(`/api/v1/leads/${id}`, { method: "PATCH", body });
      if (msg) toast(msg);
    } catch (e) {
      toast((e as Error).message, "error");
      router.refresh();
    }
  };
  const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, leads.filter((l) => l.status === s).length]));

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {LEAD_STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(filter === s ? "all" : s)} className={`rounded-xl border p-3 text-left transition ${filter === s ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
            <p className="text-xs font-semibold text-slate-500">{LABELS[s]}</p>
            <p className="text-xl font-extrabold">{counts[s]}</p>
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search name, phone or property" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="chip cursor-pointer">
          <input type="checkbox" checked={savedOnly} onChange={(e) => setSavedOnly(e.target.checked)} className="accent-brand-700" /> Starred only
        </label>
      </div>
      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No leads match.</p>
      ) : (
        <div className="space-y-3">
          {shown.map((l) => (
            <div key={l.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">{l.name}</p>
                    <StatusPill status={l.status} />
                    {l.aiScore != null && (
                      <span className={`badge ${l.aiScore >= 70 ? "bg-red-50 text-red-700" : l.aiScore >= 45 ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`} title={l.aiSummary ?? ""}>
                        <Flame className="h-3 w-3" /> {l.aiScore >= 70 ? "Hot" : l.aiScore >= 45 ? "Warm" : "Cold"} · {l.aiScore}
                      </span>
                    )}
                    <span className="badge bg-slate-100 text-slate-600">{l.source.replace("_", " ")}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {l.listingSlug ? (
                      <Link href={`/property/${l.listingSlug}`} className="hover:text-brand-700">
                        {l.listingTitle}
                      </Link>
                    ) : l.projectSlug ? (
                      <Link href={`/project/${l.projectSlug}`} className="hover:text-brand-700">
                        {l.projectName}
                      </Link>
                    ) : (
                      "Profile enquiry"
                    )}{" "}
                    · {new Date(l.createdAt).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" })}
                    {team && l.recipientName && ` · assigned to ${l.recipientName}`}
                  </p>
                  {l.offerAmount && (
                    <p className="mt-1 text-sm font-semibold text-gold-700">
                      Offer: {formatPKR(l.offerAmount)}
                      {l.listingPrice ? ` (${Math.round((l.offerAmount / l.listingPrice) * 100)}% of asking)` : ""}
                    </p>
                  )}
                  {l.message && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">“{l.message}”</p>}
                  {l.aiSummary && <p className="mt-1 text-xs text-slate-500">AI: {l.aiSummary}</p>}
                  {l.notes && <p className="mt-2 border-l-2 border-gold-300 pl-3 text-sm text-slate-600">{l.notes}</p>}
                </div>
                <button onClick={() => patch(l.id, { isSaved: !l.isSaved })} aria-label={l.isSaved ? "Unstar" : "Star"} className="p-1">
                  <Star className={`h-5 w-5 ${l.isSaved ? "fill-gold-400 text-gold-500" : "text-slate-300"}`} />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <a href={`tel:${l.phone}`} onClick={() => l.status === "new" && patch(l.id, { status: "contacted" })} className="btn-outline btn-sm">
                  <Phone className="h-3.5 w-3.5" /> {l.phone.replace("+92", "0")}
                </a>
                <a href={`https://wa.me/${l.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" onClick={() => l.status === "new" && patch(l.id, { status: "contacted" })} className="btn-outline btn-sm">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
                {l.email && (
                  <a href={`mailto:${l.email}`} className="btn-outline btn-sm">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </a>
                )}
                <button onClick={() => setNoteFor(l)} className="btn-ghost btn-sm">
                  <StickyNote className="h-3.5 w-3.5" /> Note
                </button>
                {team && members.length > 0 && (
                  <button onClick={() => setAssignFor(l)} className="btn-ghost btn-sm">
                    <UserPlus className="h-3.5 w-3.5" /> Assign
                  </button>
                )}
                <select aria-label="Lead status" className="input ml-auto w-auto py-1.5 text-xs" value={l.status} onChange={(e) => patch(l.id, { status: e.target.value }, `Moved to ${LABELS[e.target.value]}`)}>
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
      <NoteModal
        lead={noteFor}
        busy={busy}
        onClose={() => setNoteFor(null)}
        onSave={async (notes) => {
          setBusy(true);
          await patch(noteFor!.id, { notes }, "Note saved");
          setBusy(false);
          setNoteFor(null);
        }}
      />
      <Modal open={!!assignFor} onClose={() => setAssignFor(null)} title="Assign lead">
        <div className="space-y-2">
          {members.map((m) => (
            <button
              key={m.id}
              onClick={async () => {
                await patch(assignFor!.id, { assignToUserId: m.id, recipientName: m.name } as Record<string, unknown>, `Assigned to ${m.name}`);
                setAssignFor(null);
              }}
              className="card w-full p-3 text-left hover:border-brand-300"
            >
              {m.name}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function NoteModal({ lead, onClose, onSave, busy }: { lead: Lead | null; onClose: () => void; onSave: (n: string) => void; busy: boolean }) {
  const [text, setText] = useState("");
  return (
    <Modal open={!!lead} onClose={onClose} title={`Notes — ${lead?.name ?? ""}`}>
      <textarea key={lead?.id} defaultValue={lead?.notes} onChange={(e) => setText(e.target.value)} className="input min-h-32" placeholder="e.g. Wants to visit Saturday, budget flexible up to 2.4 crore" maxLength={4000} />
      <button onClick={() => onSave(text || lead?.notes || "")} disabled={busy} className="btn-primary mt-3 w-full">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save note
      </button>
    </Modal>
  );
}
