"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, KeyRound, Briefcase, Loader2 } from "lucide-react";
import { api } from "@/lib/client";
import { toast } from "./toast";

const OPTIONS = [
  { role: "seller", label: "I'm selling my property", icon: Home },
  { role: "landlord", label: "I'm renting out my property", icon: KeyRound },
  { role: "agent", label: "I'm a property agent", icon: Briefcase },
];

export function BecomeSeller() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const pick = async (role: string) => {
    setBusy(role);
    try {
      await api("/api/v1/account/roles", { body: { role } });
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
      setBusy(null);
    }
  };
  return (
    <div className="card mx-auto max-w-xl p-8 text-center">
      <h2 className="text-xl font-bold">How are you listing?</h2>
      <p className="mt-1 text-sm text-slate-500">Your account is set up for buying. Choose how you'll use Bismillah to start posting — you keep your buyer features.</p>
      <div className="mt-6 grid gap-3">
        {OPTIONS.map((o) => (
          <button key={o.role} onClick={() => pick(o.role)} disabled={!!busy} className="card flex items-center gap-3 p-4 text-left hover:border-brand-300">
            <o.icon className="h-6 w-6 text-brand-700" />
            <span className="flex-1 font-semibold">{o.label}</span>
            {busy === o.role && <Loader2 className="h-4 w-4 animate-spin" />}
          </button>
        ))}
      </div>
    </div>
  );
}
