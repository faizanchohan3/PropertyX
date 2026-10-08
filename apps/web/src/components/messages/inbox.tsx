"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Paperclip, Mic, Square, Loader2, ArrowLeft, Ban, FileText, ShieldAlert, Search } from "lucide-react";
import { formatPKR } from "@propertyx/shared";
import { api } from "@/lib/client";
import { toast } from "../toast";

type Conv = { id: string; kind: string; lastMessageAt: string; preview: string; otherName: string; otherAvatar: string | null; listingTitle: string | null; listingSlug: string | null; projectName: string | null; unread: number };
type Msg = { id: string; mine: boolean; kind: string; body: string; attachmentUrl: string | null; attachmentName: string | null; attachmentMime: string | null; hidden: boolean; createdAt: string; listing: { title: string; slug: string; price: number; purpose: string; cover: string | null } | null };
type Thread = { conversation: { id: string; kind: string }; other: { id: string; name: string; verificationLevel: number; lastReadAt: string | null; isBlocked: boolean }; blockedByMe: boolean; messages: Msg[] };

const KIND: Record<string, string> = { buyer_agent: "Buyer ↔ Agent", buyer_seller: "Buyer ↔ Seller", tenant_landlord: "Tenant ↔ Landlord", developer_buyer: "Developer ↔ Buyer", direct: "Direct" };

function initials(n: string) {
  return n.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
}

export function Inbox({ conversations: initial, activeId }: { conversations: Conv[]; activeId?: string }) {
  const router = useRouter();
  const [convs, setConvs] = useState(initial);
  const [thread, setThread] = useState<Thread | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState<MediaRecorder | null>(null);
  const [filter, setFilter] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastAt = useRef<string | undefined>(undefined);

  const loadThread = useCallback(
    async (incremental = false) => {
      if (!activeId) return;
      const after = incremental ? lastAt.current : undefined;
      const t = await api<Thread>(`/api/v1/conversations/${activeId}${after ? `?after=${encodeURIComponent(after)}` : ""}`);
      setThread((prev) => (incremental && prev ? { ...t, messages: [...prev.messages, ...t.messages.filter((m) => !prev.messages.some((p) => p.id === m.id))] } : t));
      const all = t.messages;
      if (all.length) lastAt.current = all[all.length - 1].createdAt;
      setConvs((cs) => cs.map((c) => (c.id === activeId ? { ...c, unread: 0 } : c)));
    },
    [activeId],
  );

  useEffect(() => {
    lastAt.current = undefined;
    setThread(null);
    loadThread(false).catch(() => toast("Couldn't open this conversation", "error"));
    const t = setInterval(() => loadThread(true).catch(() => {}), 5000);
    return () => clearInterval(t);
  }, [loadThread]);
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await api<{ items: Conv[] }>("/api/v1/conversations");
        setConvs(r.items.map((c) => (c.id === activeId ? { ...c, unread: 0 } : c)));
      } catch {
        /* offline */
      }
    }, 20000);
    return () => clearInterval(t);
  }, [activeId]);
  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [thread?.messages.length]);

  const send = async (form?: FormData) => {
    if (!activeId || (!form && !text.trim())) return;
    setSending(true);
    try {
      if (form) await api(`/api/v1/conversations/${activeId}`, { form });
      else await api(`/api/v1/conversations/${activeId}`, { body: { body: text.trim() } });
      setText("");
      await loadThread(true);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSending(false);
    }
  };
  const attach = (f: File | undefined) => {
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    fd.append("body", text);
    send(fd);
    if (fileRef.current) fileRef.current.value = "";
  };
  const toggleRecord = async () => {
    if (recording) {
      recording.stop();
      setRecording(null);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "" });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        if (blob.size < 1000) return;
        attach(new File([blob], `voice-note-${Date.now()}.webm`, { type: blob.type }));
      };
      rec.start();
      setRecording(rec);
      setTimeout(() => rec.state === "recording" && rec.stop(), 120_000);
    } catch {
      toast("Microphone access was denied", "error");
    }
  };
  const block = async () => {
    if (!thread) return;
    const next = !thread.blockedByMe;
    if (next && !confirm(`Block ${thread.other.name}? They won't be able to message you in this conversation.`)) return;
    await api(`/api/v1/conversations/${activeId}`, { method: "PATCH", body: { blocked: next } });
    toast(next ? "Blocked" : "Unblocked");
    loadThread(false);
  };

  const shown = convs.filter((c) => !filter || `${c.otherName} ${c.listingTitle ?? ""} ${c.projectName ?? ""}`.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="card grid h-[calc(100dvh-10rem)] min-h-[520px] overflow-hidden md:grid-cols-[320px_1fr]">
      <aside className={`flex min-h-0 flex-col border-r border-slate-200 ${activeId ? "hidden md:flex" : "flex"}`}>
        <div className="border-b border-slate-100 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input py-2 pl-9" placeholder="Search conversations" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {shown.map((c) => (
            <li key={c.id}>
              <button onClick={() => router.push(`/messages/${c.id}`)} className={`flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 ${c.id === activeId ? "bg-brand-50" : ""}`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">{initials(c.otherName)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm ${c.unread ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>{c.otherName}</span>
                    <span className="shrink-0 text-[11px] text-slate-400">{new Date(c.lastMessageAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}</span>
                  </span>
                  <span className="block truncate text-xs text-slate-500">{c.listingTitle ?? c.projectName ?? KIND[c.kind]}</span>
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate text-xs ${c.unread ? "text-slate-800" : "text-slate-400"}`}>{c.preview || "—"}</span>
                    {c.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-700 px-1 text-[10px] font-bold text-white">{c.unread}</span>}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="p-6 text-center text-sm text-slate-500">No conversations yet. Use “Message” on any property to start one.</li>}
        </ul>
      </aside>

      <section className={`min-h-0 flex-col ${activeId ? "flex" : "hidden md:flex"}`}>
        {!activeId ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-500">Select a conversation</div>
        ) : !thread ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
              <Link href="/messages" className="md:hidden" aria-label="Back">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">{initials(thread.other.name)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{thread.other.name}</p>
                <p className="text-xs text-slate-500">{KIND[thread.conversation.kind]}{thread.other.verificationLevel >= 2 ? " · ID verified" : ""}</p>
              </div>
              <button onClick={block} className="btn-ghost btn-sm text-slate-500" title={thread.blockedByMe ? "Unblock" : "Block"}>
                <Ban className="h-4 w-4" /> {thread.blockedByMe ? "Unblock" : "Block"}
              </button>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 px-4 py-4">
              <p className="mx-auto flex max-w-md items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <ShieldAlert className="h-4 w-4 shrink-0" /> Never send advance payments before visiting the property and verifying documents.
              </p>
              {thread.messages.map((m) => (
                <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${m.mine ? "rounded-br-md bg-brand-700 text-white" : "rounded-bl-md bg-white text-slate-800"}`}>
                    {m.listing && (
                      <Link href={`/property/${m.listing.slug}`} className={`mb-1 flex gap-2 rounded-xl p-2 ${m.mine ? "bg-white/10" : "bg-slate-50"}`}>
                        {m.listing.cover && <img src={m.listing.cover.replace(/w=\d+/, "w=160")} alt="" className="h-12 w-16 rounded-lg object-cover" />}
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold">{m.listing.title}</span>
                          <span className="text-xs opacity-80">{formatPKR(m.listing.price)}{m.listing.purpose === "rent" ? "/mo" : ""}</span>
                        </span>
                      </Link>
                    )}
                    {m.attachmentUrl && m.attachmentMime?.startsWith("image/") && <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer"><img src={m.attachmentUrl} alt={m.attachmentName ?? "Image"} className="mb-1 max-h-60 rounded-xl" /></a>}
                    {m.attachmentUrl && m.attachmentMime?.startsWith("audio/") && <audio controls src={m.attachmentUrl} className="mb-1 max-w-full" />}
                    {m.attachmentUrl && m.attachmentMime === "application/pdf" && (
                      <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className={`mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5 ${m.mine ? "bg-white/10" : "bg-slate-50"}`}>
                        <FileText className="h-4 w-4" /> <span className="truncate">{m.attachmentName}</span>
                      </a>
                    )}
                    {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                    {m.hidden && <p className="text-xs italic opacity-80">Held by spam filter — not delivered</p>}
                    <p className={`mt-0.5 text-right text-[10px] ${m.mine ? "text-brand-100" : "text-slate-400"}`}>
                      {new Date(m.createdAt).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" })}
                      {m.mine && thread.other.lastReadAt && new Date(thread.other.lastReadAt) >= new Date(m.createdAt) ? " · Seen" : ""}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            {thread.other.isBlocked ? (
              <p className="border-t border-slate-200 p-4 text-center text-sm text-slate-500">You can't reply to this conversation.</p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex items-end gap-2 border-t border-slate-200 p-3"
              >
                <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost h-11 w-11 p-0" aria-label="Attach file" disabled={sending}>
                  <Paperclip className="h-5 w-5" />
                </button>
                <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => attach(e.target.files?.[0])} />
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  maxLength={4000}
                  placeholder={recording ? "Recording… tap stop to send" : "Type a message"}
                  className="input max-h-32 min-h-11 resize-none"
                  disabled={!!recording}
                />
                <button type="button" onClick={toggleRecord} className={`btn h-11 w-11 p-0 ${recording ? "bg-red-600 text-white" : "btn-ghost"}`} aria-label={recording ? "Stop recording" : "Record voice message"}>
                  {recording ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
                </button>
                <button className="btn-primary h-11 w-11 p-0" disabled={sending || !text.trim()} aria-label="Send">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            )}
          </>
        )}
      </section>
    </div>
  );
}
