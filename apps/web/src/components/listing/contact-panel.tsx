"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, MessageCircle, MessageSquare, CalendarDays, HandCoins, Share2, Flag, Loader2, Info } from "lucide-react";
import { REPORT_REASONS, formatPKR } from "@propertyx/shared";
import { api, ApiError, anonId, fieldError } from "@/lib/client";
import { Modal, FieldError, FormError } from "../modal";
import { SaveButton } from "../save-button";
import { toast } from "../toast";

export interface ContactProps {
  listingId: string;
  slug: string;
  title: string;
  price: number;
  purpose: "sale" | "rent";
  contactName: string;
  contactPhone: string;
  contactWhatsapp: string | null;
  isSeed: boolean;
  isOwner: boolean;
  active: boolean;
  saved: boolean;
  user: { name: string; email: string; phone: string | null } | null;
}

const track = (listingId: string, type: string) => fetch(`/api/v1/listings/${listingId}/events`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, anonId: anonId() }) }).catch(() => {});

export function ContactPanel(p: ContactProps) {
  const router = useRouter();
  const [showPhone, setShowPhone] = useState(false);
  const [modal, setModal] = useState<null | "visit" | "offer" | "enquiry" | "report">(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const loginFirst = () => router.push(`/login?next=${encodeURIComponent(`/property/${p.slug}`)}`);
  const contactsDisabled = p.isSeed;
  const waNumber = (p.contactWhatsapp ?? p.contactPhone).replace(/\D/g, "");
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const submit = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      toast(ok);
      setModal(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) loginFirst();
      setErr(e);
    } finally {
      setBusy(false);
    }
  };

  const message = async () => {
    if (!p.user) return loginFirst();
    setBusy(true);
    try {
      const r = await api<{ id: string }>("/api/v1/conversations", { body: { listingId: p.listingId, message: `Hi, I'm interested in “${p.title}”. Is it still available?` } });
      track(p.listingId, "message");
      router.push(`/messages/${r.id}`);
    } catch (e) {
      toast((e as Error).message, "error");
      setBusy(false);
    }
  };

  const share = async () => {
    track(p.listingId, "share");
    if (navigator.share) {
      try {
        await navigator.share({ title: p.title, url: shareUrl });
      } catch {
        /* dismissed */
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast("Link copied");
    }
  };

  if (p.isOwner)
    return (
      <div className="space-y-2">
        <a href={`/dashboard/listings/${p.listingId}/edit`} className="btn-primary w-full">
          Edit listing
        </a>
        <a href={`/dashboard/listings/${p.listingId}`} className="btn-outline w-full">
          View analytics & leads
        </a>
      </div>
    );

  return (
    <div className="space-y-2.5">
      {!p.active && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">This listing is no longer active.</p>}
      {contactsDisabled && (
        <p className="flex gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0" /> Demo listing — phone and WhatsApp are disabled. Use in-app messaging or the forms below to test the flow.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {showPhone && !contactsDisabled ? (
          <a href={`tel:${p.contactPhone}`} className="btn-primary" onClick={() => track(p.listingId, "call_click")}>
            <Phone className="h-4 w-4" /> {p.contactPhone.replace("+92", "0")}
          </a>
        ) : (
          <button
            className="btn-primary"
            disabled={contactsDisabled || !p.active}
            onClick={() => {
              setShowPhone(true);
              track(p.listingId, "phone_reveal");
            }}
          >
            <Phone className="h-4 w-4" /> Call
          </button>
        )}
        <a
          href={contactsDisabled || !p.active ? undefined : `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hi, I saw “${p.title}” on PropertyX. Is it available?`)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={contactsDisabled}
          onClick={() => !contactsDisabled && track(p.listingId, "whatsapp_click")}
          className={`btn bg-[#25D366] text-white hover:bg-[#1ebe5b] ${contactsDisabled || !p.active ? "pointer-events-none opacity-50" : ""}`}
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
      </div>
      <button className="btn-outline w-full" onClick={message} disabled={busy || !p.active}>
        {busy && !modal ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />} Message
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button className="btn-outline" disabled={!p.active} onClick={() => (p.user ? setModal("visit") : loginFirst())}>
          <CalendarDays className="h-4 w-4" /> Request Visit
        </button>
        <button className="btn-outline" disabled={!p.active} onClick={() => setModal("offer")}>
          <HandCoins className="h-4 w-4" /> Make Offer
        </button>
      </div>
      <button className="btn-ghost w-full text-brand-700" disabled={!p.active} onClick={() => setModal("enquiry")}>
        <CalendarDays className="h-4 w-4" /> Schedule a viewing call-back
      </button>
      <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
        <SaveButton listingId={p.listingId} initial={p.saved} variant="button" />
        <button className="btn-outline flex-1" onClick={share}>
          <Share2 className="h-4 w-4" /> Share
        </button>
        <button className="btn-ghost px-3 text-slate-500" onClick={() => setModal("report")} title="Report listing" aria-label="Report listing">
          <Flag className="h-4 w-4" />
        </button>
      </div>

      <VisitModal open={modal === "visit"} onClose={() => setModal(null)} busy={busy} err={err} phone={p.user?.phone ?? ""} onSubmit={(v) => submit(() => api("/api/v1/appointments", { body: { ...v, listingId: p.listingId } }), "Visit requested. You'll be notified when it's confirmed.")} />
      <LeadModal
        mode={modal === "offer" ? "offer" : "enquiry"}
        open={modal === "offer" || modal === "enquiry"}
        onClose={() => setModal(null)}
        busy={busy}
        err={err}
        user={p.user}
        price={p.price}
        purpose={p.purpose}
        onSubmit={(v) => submit(() => api("/api/v1/leads", { body: { ...v, listingId: p.listingId } }), modal === "offer" ? "Offer sent to the seller" : "Request sent. The seller will call you back.")}
      />
      <ReportModal open={modal === "report"} onClose={() => setModal(null)} busy={busy} err={err} onSubmit={(v) => submit(() => api("/api/v1/reports", { body: { ...v, targetType: "listing", targetId: p.listingId } }), "Thanks — our Trust & Safety team will review this.")} />
    </div>
  );
}

function VisitModal({ open, onClose, onSubmit, busy, err, phone: initialPhone }: { open: boolean; onClose: () => void; onSubmit: (v: Record<string, unknown>) => void; busy: boolean; err: unknown; phone: string }) {
  const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState("16:00");
  const [visitors, setVisitors] = useState(1);
  const [phone, setPhone] = useState(initialPhone);
  const [message, setMessage] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Request a visit">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ date, time, visitors, phone, message });
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="v-date">Date</label>
            <input id="v-date" type="date" className="input" min={tomorrow} value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="v-time">Time</label>
            <select id="v-time" className="input" value={time} onChange={(e) => setTime(e.target.value)}>
              {Array.from({ length: 23 }, (_, i) => `${String(9 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="v-n">Visitors</label>
            <input id="v-n" type="number" min={1} max={10} className="input" value={visitors} onChange={(e) => setVisitors(Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="v-phone">Your phone</label>
            <input id="v-phone" className="input" placeholder="03XX XXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <FieldError msg={fieldError(err, "phone")} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="v-msg">Message (optional)</label>
          <textarea id="v-msg" className="input min-h-20" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} />
        </div>
        <FormError msg={err instanceof Error ? err.message : null} />
        <button className="btn-primary w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send request
        </button>
      </form>
    </Modal>
  );
}

function LeadModal({ mode, open, onClose, onSubmit, busy, err, user, price, purpose }: { mode: "offer" | "enquiry"; open: boolean; onClose: () => void; onSubmit: (v: Record<string, unknown>) => void; busy: boolean; err: unknown; user: ContactProps["user"]; price: number; purpose: string }) {
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone?.replace("+92", "0") ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [offer, setOffer] = useState(String(Math.round((price * 0.95) / 100_000) * 100_000));
  const [message, setMessage] = useState(mode === "offer" ? "" : "Please call me back to arrange a viewing.");
  return (
    <Modal open={open} onClose={onClose} title={mode === "offer" ? "Make an offer" : "Request a call-back"}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ name, phone, email, message, source: mode === "offer" ? "offer" : "form", offerAmount: mode === "offer" ? Number(offer) : undefined });
        }}
      >
        {mode === "offer" && (
          <div>
            <label className="label" htmlFor="o-amt">Your offer (PKR){purpose === "rent" ? " per month" : ""}</label>
            <input id="o-amt" inputMode="numeric" className="input text-lg font-semibold" value={offer} onChange={(e) => setOffer(e.target.value.replace(/\D/g, ""))} required />
            <p className="mt-1 text-xs text-slate-500">
              {Number(offer) > 0 && `${formatPKR(Number(offer))} — ${Math.round((Number(offer) / price) * 100)}% of the asking price (${formatPKR(price)})`}
            </p>
          </div>
        )}
        <div>
          <label className="label" htmlFor="l-name">Name</label>
          <input id="l-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          <FieldError msg={fieldError(err, "name")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="l-phone">Phone</label>
            <input id="l-phone" className="input" placeholder="03XX XXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            <FieldError msg={fieldError(err, "phone")} />
          </div>
          <div>
            <label className="label" htmlFor="l-email">Email</label>
            <input id="l-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="l-msg">Message</label>
          <textarea id="l-msg" className="input min-h-20" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} />
        </div>
        <FormError msg={err instanceof Error ? err.message : null} />
        <button className="btn-primary w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {mode === "offer" ? "Send offer" : "Send request"}
        </button>
        <p className="text-center text-[11px] text-slate-400">Your details are shared only with the advertiser of this property.</p>
      </form>
    </Modal>
  );
}

export function ReportModal({ open, onClose, onSubmit, busy, err }: { open: boolean; onClose: () => void; onSubmit: (v: Record<string, unknown>) => void; busy: boolean; err: unknown }) {
  const [reason, setReason] = useState("fraud");
  const [details, setDetails] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Report this listing">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ reason, details });
        }}
      >
        <div className="space-y-2">
          {REPORT_REASONS.map((r) => (
            <label key={r.key} className="flex items-center gap-2 text-sm">
              <input type="radio" name="reason" value={r.key} checked={reason === r.key} onChange={() => setReason(r.key)} className="accent-brand-700" /> {r.label}
            </label>
          ))}
        </div>
        <textarea className="input min-h-24" placeholder="Tell us what happened (optional)" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} />
        <FormError msg={err instanceof Error ? err.message : null} />
        <button className="btn-danger w-full" disabled={busy}>
          Submit report
        </button>
      </form>
    </Modal>
  );
}
