"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { toast } from "../toast";

export function ReviewReply({ id, existing }: { id: string; existing: string | null }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(existing ?? "");
  const router = useRouter();
  if (existing && !open)
    return (
      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
        <p className="text-xs font-semibold text-slate-500">Your response</p>
        <p className="text-slate-700">{existing}</p>
        <button onClick={() => setOpen(true)} className="mt-1 text-xs font-semibold text-brand-700">Edit</button>
      </div>
    );
  if (!open) return <button onClick={() => setOpen(true)} className="mt-3 text-sm font-semibold text-brand-700">Respond publicly</button>;
  return (
    <div className="mt-3 space-y-2">
      <textarea className="input min-h-20" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Thank the client or clarify — keep it professional." />
      <div className="flex gap-2">
        <button
          className="btn-primary btn-sm"
          onClick={async () => {
            try {
              await api(`/api/v1/reviews/${id}/respond`, { body: { body: text } });
              toast("Response published");
              setOpen(false);
              router.refresh();
            } catch (e) {
              toast((e as Error).message, "error");
            }
          }}
        >
          Publish response
        </button>
        <button className="btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}
