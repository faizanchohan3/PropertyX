"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { api } from "@/lib/client";
import { Modal, FormError } from "../modal";
import { StatusPill } from "../badges";
import { toast } from "../toast";

const CATEGORIES = ["general", "plumbing", "electrical", "appliance", "structural", "cleaning", "pest"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

export function TenantMaintenance({ leaseId, items }: { leaseId: string; items: { id: string; title: string; status: string; createdAt: string; priority: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setErr(null);
    try {
      await api("/api/v1/rentals/maintenance", { body: { leaseId, title: fd.get("title"), description: fd.get("description"), category: fd.get("category"), priority: fd.get("priority") } });
      toast("Sent to your landlord");
      setOpen(false);
      router.refresh();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <ul className="divide-y divide-slate-100 text-sm">
        {items.map((m) => (
          <li key={m.id} className="flex items-center justify-between py-2">
            <span>
              {m.title} <span className="text-xs text-slate-400">· {new Date(m.createdAt).toLocaleDateString("en-PK")}</span>
            </span>
            <StatusPill status={m.status} />
          </li>
        ))}
        {!items.length && <li className="py-2 text-slate-500">No requests yet.</li>}
      </ul>
      <button onClick={() => setOpen(true)} className="btn-outline btn-sm mt-3">
        <Plus className="h-3.5 w-3.5" /> New request
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Request maintenance">
        <form className="space-y-3" onSubmit={submit}>
          <div>
            <label className="label" htmlFor="tm-t">What's wrong?</label>
            <input id="tm-t" name="title" className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="tm-d">Details</label>
            <textarea id="tm-d" name="description" className="input min-h-24" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="tm-c">Category</label>
              <select id="tm-c" name="category" className="input">
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="tm-p">Priority</label>
              <select id="tm-p" name="priority" className="input" defaultValue="normal">
                {PRIORITIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <FormError msg={err} />
          <button className="btn-primary w-full" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send request
          </button>
        </form>
      </Modal>
    </div>
  );
}
