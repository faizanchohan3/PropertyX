"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, PhoneCall } from "lucide-react";
import { COUNTRY, isUAE, type ToolLeadKind } from "@propertyx/shared";
import { api, ApiError, fieldError } from "@/lib/client";
import { FieldError, FormError } from "../modal";

const COPY: Record<ToolLeadKind, { title: string; text: string; button: string; placeholder: string }> = {
  home_loan: {
    title: isUAE ? "Get mortgage pre-approval help" : "Get help with home financing",
    text: isUAE
      ? "A mortgage adviser can compare rates from UAE banks for these numbers and help you get pre-approved. Free, no obligation."
      : "Our team can compare home-financing offers from banks for these numbers and guide you through the application. Free, no obligation.",
    button: "Request a call back",
    placeholder: isUAE ? "e.g. salaried, AED 30,000 a month, buying in the next 3 months" : "e.g. salaried, buying in the next 3 months",
  },
  buying_costs: {
    title: "Talk to someone about the costs",
    text: "Not sure about the fees, the transfer process or how much cash to keep ready? Our team will call you and walk you through it.",
    button: "Request a call back",
    placeholder: "Anything you'd like us to check",
  },
  property_value: {
    title: "Want to sell or rent it out?",
    text: "Get a free, accurate valuation from a local agent and list with an expert who knows the area.",
    button: "Get a free valuation",
    placeholder: "e.g. I want to sell in the next 2 months",
  },
  investment: {
    title: "Get investment advice",
    text: "Tell us your budget and goal and our team will share properties and projects that fit these numbers.",
    button: "Request a call back",
    placeholder: "e.g. budget, area, rental or capital growth",
  },
  construction_cost: {
    title: "Get quotes from builders",
    text: "Share your plot details and we'll connect you with construction companies for detailed quotes.",
    button: "Get quotes",
    placeholder: "e.g. plot location, when you want to start",
  },
  installment: {
    title: "Find properties on these installments",
    text: "Our team will share projects and properties with payment plans that match this budget.",
    button: "Request a call back",
    placeholder: "e.g. preferred area or project",
  },
};

/** "Talk to an expert" box under a calculator: sends what the visitor worked out to the site team. */
export function ToolLeadForm({ tool, context }: { tool: ToolLeadKind; context: Record<string, string | number> }) {
  const c = COPY[tool];
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    let live = true;
    api<{ user: { name?: string; email?: string; phone?: string | null } | null }>("/api/v1/auth/me")
      .then(({ user }) => {
        if (!live || !user) return;
        setName((v) => v || user.name || "");
        setEmail((v) => v || user.email || "");
        setPhone((v) => v || (user.phone ? user.phone.replace(COUNTRY.phone.dial, "0") : ""));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [open]);

  if (done)
    return (
      <div className="mt-6 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <p>
          <span className="font-semibold">Thanks, {name.split(" ")[0]}!</span> Our team will contact you on {phone} soon.
        </p>
      </div>
    );

  return (
    <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
      <p className="font-bold text-slate-900">{c.title}</p>
      <p className="mt-1 text-sm text-slate-600">{c.text}</p>
      {!open ? (
        <button type="button" className="btn-primary mt-3" onClick={() => setOpen(true)}>
          <PhoneCall className="h-4 w-4" /> {c.button}
        </button>
      ) : (
        <form
          className="mt-3 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr(null);
            try {
              await api("/api/v1/tool-leads", { body: { tool, name, phone, email, message, context } });
              setDone(true);
            } catch (e2) {
              setErr(e2);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={`tl-name-${tool}`}>Your name</label>
              <input id={`tl-name-${tool}`} className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name" />
              <FieldError msg={fieldError(err, "name")} />
            </div>
            <div>
              <label className="label" htmlFor={`tl-phone-${tool}`}>{COUNTRY.phone.label}</label>
              <input id={`tl-phone-${tool}`} className="input" type="tel" placeholder={COUNTRY.phone.example} value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" />
              <FieldError msg={fieldError(err, "phone")} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor={`tl-email-${tool}`}>Email (optional)</label>
            <input id={`tl-email-${tool}`} className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <FieldError msg={fieldError(err, "email")} />
          </div>
          <div>
            <label className="label" htmlFor={`tl-msg-${tool}`}>Anything else? (optional)</label>
            <textarea id={`tl-msg-${tool}`} className="input min-h-20 resize-y" placeholder={c.placeholder} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} />
          </div>
          <FormError msg={err instanceof ApiError && !err.details?.fieldErrors ? err.message : err && !(err instanceof ApiError) ? "Something went wrong. Please try again." : null} />
          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />} {c.button}
          </button>
          <p className="text-xs text-slate-500">We&apos;ll share the numbers from this calculator with our team so they can help. We never sell your details.</p>
        </form>
      )}
    </div>
  );
}
