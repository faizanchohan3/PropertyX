"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare } from "lucide-react";
import { api } from "@/lib/client";
import { toast } from "../toast";

/** Message box that starts an in-app conversation with a developer (projectId) or a person (userId). */
export function ContactBox({ to, target, defaultText, loggedIn, next }: { to: string; target: { projectId: string } | { userId: string }; defaultText: string; loggedIn: boolean; next: string }) {
  const router = useRouter();
  const [text, setText] = useState(defaultText);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!loggedIn) return router.push(`/login?next=${encodeURIComponent(next)}`);
    if (!text.trim()) return;
    setBusy(true);
    try {
      const r = await api<{ id: string }>("/api/v1/conversations", { body: { ...target, message: text.trim() } });
      router.push(`/messages/${r.id}`);
    } catch (e) {
      toast((e as Error).message, "error");
      setBusy(false);
    }
  };
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <label className="label" htmlFor="cb-msg">Message {to}</label>
      <textarea id="cb-msg" className="input min-h-24 resize-y" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
      <button className="btn-primary w-full" disabled={busy || !text.trim()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />} {loggedIn ? "Send message" : "Log in to send"}
      </button>
    </form>
  );
}
