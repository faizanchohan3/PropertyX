"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CreditCard } from "lucide-react";
import { api, ApiError } from "@/lib/client";
import { Modal } from "./modal";
import { toast } from "./toast";

type Gateway = { key: string; name: string; description: string; methods: string[] };
type Action = { type: "redirect"; url: string } | { type: "form_post"; url: string; fields: Record<string, string> };

/** Starts a payment with the chosen gateway (server computes the amount). */
export function CheckoutButton({ purpose, referenceId, option, label, className = "btn-primary w-full", gateways, disabled }: { purpose: string; referenceId: string; option?: string; label: string; className?: string; gateways: Gateway[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();
  const pay = async (gateway: string) => {
    setBusy(gateway);
    try {
      const r = await api<{ action: Action }>("/api/v1/payments/checkout", { body: { purpose, referenceId, option, gateway } });
      if (r.action.type === "redirect") window.location.href = r.action.url;
      else {
        const f = document.createElement("form");
        f.method = "POST";
        f.action = r.action.url;
        for (const [k, v] of Object.entries(r.action.fields)) {
          const i = document.createElement("input");
          i.type = "hidden";
          i.name = k;
          i.value = v;
          f.appendChild(i);
        }
        document.body.appendChild(f);
        f.submit();
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
      else toast((e as Error).message, "error");
      setBusy(null);
    }
  };
  return (
    <>
      <button className={className} disabled={disabled} onClick={() => (gateways.length === 1 ? pay(gateways[0].key) : setOpen(true))}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Choose a payment method">
        {gateways.length === 0 && <p className="text-sm text-slate-500">No payment methods are configured.</p>}
        <div className="space-y-2">
          {gateways.map((g) => (
            <button key={g.key} onClick={() => pay(g.key)} disabled={!!busy} className="card flex w-full items-center gap-3 p-4 text-left hover:border-brand-300">
              <CreditCard className="h-5 w-5 text-brand-700" />
              <span className="flex-1">
                <span className="block font-semibold">{g.name}</span>
                <span className="text-xs text-slate-500">{g.description}</span>
              </span>
              {busy === g.key && <Loader2 className="h-4 w-4 animate-spin" />}
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
