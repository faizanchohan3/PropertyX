"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { toast } from "../toast";

export function CancelSubscription() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button
      disabled={busy}
      className="btn-ghost text-red-600"
      onClick={async () => {
        if (!confirm("Cancel at the end of the current period? You keep all features until then.")) return;
        setBusy(true);
        try {
          await api("/api/v1/payments/subscription", { method: "DELETE" });
          toast("Subscription will end at the period end");
          router.refresh();
        } catch (e) {
          toast((e as Error).message, "error");
        } finally {
          setBusy(false);
        }
      }}
    >
      Cancel plan
    </button>
  );
}
