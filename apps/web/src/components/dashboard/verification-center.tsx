"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, FileText, Loader2, ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import { VERIFICATION_LEVELS } from "@propertyx/shared";
import { api } from "@/lib/client";
import { toast } from "../toast";
import { StatusPill } from "../badges";

type Doc = { id: string; kind: string; originalName: string; createdAt: string; verificationRequestId: string | null; mime: string };
type Req = { id: string; subjectType: string; subjectId: string; requestedLevel: number; status: string; notes: string | null; reviewerNotes: string | null; createdAt: string; expiresAt: string | null };
type Subject = { type: string; id: string; label: string; currentLevel: number; maxLevel: number };

const DOC_KINDS = [
  { key: "cnic_front", label: "CNIC (front)" },
  { key: "cnic_back", label: "CNIC (back)" },
  { key: "ownership", label: "Registry / ownership document" },
  { key: "allotment", label: "Allotment / transfer letter" },
  { key: "noc", label: "Society NOC / NDC" },
  { key: "utility_bill", label: "Utility bill" },
  { key: "developer_license", label: "Developer approval / licence" },
  { key: "other", label: "Other supporting document" },
];

export function VerificationCenter({ subjects, docs: initialDocs, requests, phoneVerified }: { subjects: Subject[]; docs: Doc[]; requests: Req[]; phoneVerified: boolean }) {
  const router = useRouter();
  const [docs, setDocs] = useState(initialDocs);
  const [subjectKey, setSubjectKey] = useState(`${subjects[0]?.type}:${subjects[0]?.id}`);
  const subject = subjects.find((s) => `${s.type}:${s.id}` === subjectKey) ?? subjects[0];
  const [level, setLevel] = useState(Math.min(subject?.maxLevel ?? 2, Math.max(2, (subject?.currentLevel ?? 1) + 1)));
  const [kind, setKind] = useState("cnic_front");
  const [selected, setSelected] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  const upload = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", f);
      form.append("kind", kind);
      const d = await api<Doc>("/api/v1/documents", { form });
      setDocs((x) => [{ ...d, createdAt: new Date().toISOString(), verificationRequestId: null }, ...x]);
      setSelected((s) => [...s, d.id]);
      toast("Uploaded privately");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  };
  const submit = async () => {
    setBusy(true);
    try {
      await api("/api/v1/verification", { body: { subjectType: subject.type, subjectId: subject.id, level, documentIds: selected, notes } });
      toast("Submitted. Our verification team will review it shortly.");
      setSelected([]);
      setNotes("");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };
  const unattached = docs.filter((d) => !d.verificationRequestId);

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="mb-4 font-bold">Verification levels</h2>
        <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {VERIFICATION_LEVELS.map((v) => (
            <li key={v.level} className={`rounded-xl p-3 text-xs ${v.level === 1 && phoneVerified ? "bg-brand-50 ring-1 ring-brand-200" : "bg-slate-50"}`}>
              <p className="font-bold text-slate-800">
                {v.level}. {v.label}
              </p>
              <p className="mt-1 text-slate-500">{v.description}</p>
            </li>
          ))}
        </ol>
        {!phoneVerified && (
          <p className="mt-4 text-sm">
            Start with level 1:{" "}
            <Link href="/account#security" className="font-semibold text-brand-700">
              verify your phone number
            </Link>
            .
          </p>
        )}
      </div>

      <div className="card p-6">
        <h2 className="mb-1 flex items-center gap-2 font-bold">
          <ShieldCheck className="h-5 w-5 text-brand-600" /> New verification request
        </h2>
        <p className="mb-5 flex items-center gap-1.5 text-xs text-slate-500">
          <Lock className="h-3.5 w-3.5" /> Documents are stored privately and are only visible to you and PropertyX verification staff.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="v-subject">What to verify</label>
            <select
              id="v-subject"
              className="input"
              value={subjectKey}
              onChange={(e) => {
                setSubjectKey(e.target.value);
                const s = subjects.find((x) => `${x.type}:${x.id}` === e.target.value)!;
                setLevel(Math.min(s.maxLevel, Math.max(s.type === "listing" ? 3 : 2, s.currentLevel + 1)));
              }}
            >
              {subjects.map((s) => (
                <option key={`${s.type}:${s.id}`} value={`${s.type}:${s.id}`}>
                  {s.label} (now level {s.currentLevel})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="v-level">Requested level</label>
            <select id="v-level" className="input" value={level} onChange={(e) => setLevel(Number(e.target.value))}>
              {VERIFICATION_LEVELS.filter((v) => v.level >= (subject?.type === "listing" ? 3 : 2) && v.level <= (subject?.maxLevel ?? 2)).map((v) => (
                <option key={v.level} value={v.level}>
                  {v.level} — {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">{level === 2 ? "Required: CNIC front and back." : "Required: ownership document (registry, allotment or transfer letter). Level 5 also requires a site inspection appointment."}</p>

        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1">
              <label className="label" htmlFor="v-kind">Document type</label>
              <select id="v-kind" className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
                {DOC_KINDS.map((k) => (
                  <option key={k.key} value={k.key}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={() => file.current?.click()} disabled={busy} className="btn-outline">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload PDF / photo
            </button>
            <input ref={file} type="file" hidden accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => upload(e.target.files?.[0])} />
          </div>
          {unattached.length > 0 && (
            <ul className="mt-4 space-y-2">
              {unattached.map((d) => (
                <li key={d.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={selected.includes(d.id)} onChange={() => setSelected((s) => (s.includes(d.id) ? s.filter((x) => x !== d.id) : [...s, d.id]))} />
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="flex-1 truncate">{d.originalName}</span>
                  <span className="text-xs text-slate-500">{DOC_KINDS.find((k) => k.key === d.kind)?.label}</span>
                  <a href={`/api/v1/documents/${d.id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand-700">
                    View
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <textarea className="input mt-4 min-h-20" placeholder="Notes for the reviewer (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
        <button onClick={submit} disabled={busy || !subject} className="btn-primary mt-4">
          Submit for verification
        </button>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-bold">Your requests</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-slate-500">No verification requests yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold capitalize">
                    {r.subjectType} → level {r.requestedLevel}
                  </p>
                  <p className="text-xs text-slate-500">
                    Submitted {new Date(r.createdAt).toLocaleDateString("en-PK", { dateStyle: "medium" })}
                    {r.expiresAt && ` · valid until ${new Date(r.expiresAt).toLocaleDateString("en-PK", { dateStyle: "medium" })}`}
                  </p>
                  {r.reviewerNotes && <p className="mt-1 text-sm text-slate-600">Reviewer: {r.reviewerNotes}</p>}
                </div>
                <span className="flex items-center gap-2">
                  {r.status === "approved" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  <StatusPill status={r.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
