"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Save } from "lucide-react";
import { api } from "@/lib/client";
import { toast } from "../toast";
import { darkBtn, darkInput, okBtn } from "./ui";

/** Admin → Leads: forward every new lead to Zapier / Make / Google Sheets / a CRM. */
export function LeadWebhookForm({ initial, envUrl }: { initial: { url?: string; secret?: string; enabled?: boolean } | null; envUrl: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState(initial?.url ?? "");
  const [secret, setSecret] = useState(initial?.secret ?? "");
  const [enabled, setEnabled] = useState(initial?.enabled !== false);
  const [busy, setBusy] = useState<"" | "save" | "test">("");
  const save = async () => {
    if (url && !/^https:\/\//i.test(url.trim())) return toast("The URL must start with https://", "error");
    setBusy("save");
    try {
      await api("/api/v1/admin/setting.set", { body: { key: "lead_webhook", value: { url: url.trim(), secret: secret.trim(), enabled } } });
      toast("Saved");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy("");
    }
  };
  const test = async () => {
    setBusy("test");
    try {
      const r = await api<{ sent: boolean; status?: number; error?: string }>("/api/v1/admin/lead.webhook.test", { body: {} });
      toast(r.sent ? `Test lead delivered (${r.status})` : `Not delivered: ${r.error ?? "unknown error"}`, r.sent ? "success" : "error");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-400" htmlFor="wh-url">Webhook URL</label>
        <input id="wh-url" className={darkInput} placeholder="https://hooks.zapier.com/hooks/catch/…" value={url} onChange={(e) => setUrl(e.target.value)} />
        {envUrl && !url && <p className="mt-1 text-xs text-slate-500">Using LEADS_WEBHOOK_URL from the environment.</p>}
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-400" htmlFor="wh-secret">Signing secret (optional)</label>
        <input id="wh-secret" className={darkInput} placeholder="Sent as an x-bismillah-signature HMAC header" value={secret} onChange={(e) => setSecret(e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Send new leads
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={okBtn} onClick={save} disabled={!!busy}>
          {busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
        </button>
        <button type="button" className={darkBtn} onClick={test} disabled={!!busy}>
          {busy === "test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send test lead
        </button>
      </div>
    </div>
  );
}
