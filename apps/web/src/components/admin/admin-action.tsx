"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/client";
import { toast } from "../toast";

/** Generic button that posts an admin action, optionally prompting for a reason. */
export function AdminAction({ action, payload, label, className = "btn-outline btn-sm", confirmText, promptFor, promptRequired = false, done = "Done", icon }: { action: string; payload: Record<string, unknown>; label: string; className?: string; confirmText?: string; promptFor?: { key: string; label: string }; promptRequired?: boolean; done?: string; icon?: React.ReactNode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      className={className}
      onClick={async () => {
        if (confirmText && !confirm(confirmText)) return;
        const body = { ...payload };
        if (promptFor) {
          const v = prompt(promptFor.label);
          if (v === null) return;
          if (promptRequired && !v.trim()) return toast(`${promptFor.label} is required`, "error");
          body[promptFor.key] = v;
        }
        setBusy(true);
        try {
          await api(`/api/v1/admin/${action}`, { body });
          toast(done);
          router.refresh();
        } catch (e) {
          toast((e as Error).message, "error");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon} {label}
    </button>
  );
}

export function AdminSelect({ action, payload, field, value, options, label }: { action: string; payload: Record<string, unknown>; field: string; value: string; options: { v: string; l: string }[]; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <select
      aria-label={label}
      disabled={busy}
      value={value}
      className="rounded-lg border border-white/10 bg-night-3 px-2 py-1.5 text-xs text-slate-200"
      onChange={async (e) => {
        setBusy(true);
        try {
          await api(`/api/v1/admin/${action}`, { body: { ...payload, [field]: e.target.value } });
          toast("Updated");
          router.refresh();
        } catch (err) {
          toast((err as Error).message, "error");
        } finally {
          setBusy(false);
        }
      }}
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.l}
        </option>
      ))}
    </select>
  );
}
