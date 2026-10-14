"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileText, Loader2, PhoneCall } from "lucide-react";
import { COUNTRY } from "@propertyx/shared";
import { api, ApiError, fieldError } from "@/lib/client";
import { FieldError, FormError, Modal } from "../modal";

type Target = { projectId: string } | { agentId: string } | { agencyId: string } | { developerId: string };
type Me = { name?: string; email?: string; phone?: string | null } | null;

function useMe(active: boolean) {
  const [me, setMe] = useState<Me>(null);
  useEffect(() => {
    if (!active) return;
    let live = true;
    api<{ user: Me }>("/api/v1/auth/me")
      .then((r) => live && setMe(r.user))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [active]);
  return me;
}

const localPhone = (p?: string | null) => (p ? p.replace(COUNTRY.phone.dial, "0") : "");

function LeadFields({ id, name, setName, phone, setPhone, email, setEmail, err }: { id: string; name: string; setName: (v: string) => void; phone: string; setPhone: (v: string) => void; email: string; setEmail: (v: string) => void; err: unknown }) {
  return (
    <>
      <div>
        <label className="label" htmlFor={`${id}-name`}>Your name</label>
        <input id={`${id}-name`} className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name" />
        <FieldError msg={fieldError(err, "name")} />
      </div>
      <div>
        <label className="label" htmlFor={`${id}-phone`}>{COUNTRY.phone.label}</label>
        <input id={`${id}-phone`} className="input" type="tel" placeholder={COUNTRY.phone.example} value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" />
        <FieldError msg={fieldError(err, "phone")} />
      </div>
      <div>
        <label className="label" htmlFor={`${id}-email`}>Email (optional)</label>
        <input id={`${id}-email`} className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <FieldError msg={fieldError(err, "email")} />
      </div>
    </>
  );
}

const formError = (err: unknown) => (err instanceof ApiError ? (err.details?.fieldErrors && Object.keys(err.details.fieldErrors).length ? null : err.message) : err ? "Something went wrong. Please try again." : null);

/** Call-back request (no account needed) that lands in the developer's / agent's Leads. */
export function LeadRequestBox({ target, to, defaultMessage, paymentPlan = false }: { target: Target; to: string; defaultMessage: string; paymentPlan?: boolean }) {
  const [open, setOpen] = useState(false);
  const me = useMe(open);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(defaultMessage);
  const [source, setSource] = useState<"form" | "payment_plan">("form");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!me) return;
    setName((v) => v || me.name || "");
    setEmail((v) => v || me.email || "");
    setPhone((v) => v || localPhone(me.phone));
  }, [me]);

  if (done)
    return (
      <p className="flex gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
        <CheckCircle2 className="h-5 w-5 shrink-0" /> Request sent. {to} will contact you on {phone}.
      </p>
    );
  if (!open)
    return (
      <div className={paymentPlan ? "grid grid-cols-2 gap-2" : ""}>
        <button type="button" className="btn-primary w-full" onClick={() => setOpen(true)}>
          <PhoneCall className="h-4 w-4" /> Request a call back
        </button>
        {paymentPlan && (
          <button
            type="button"
            className="btn-outline w-full"
            onClick={() => {
              setSource("payment_plan");
              setMessage(`${defaultMessage} Please send me the full payment plan.`);
              setOpen(true);
            }}
          >
            <FileText className="h-4 w-4" /> Payment plan
          </button>
        )}
      </div>
    );
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          await api("/api/v1/leads", { body: { ...target, name, phone, email, message, source } });
          setDone(true);
        } catch (e2) {
          setErr(e2);
        } finally {
          setBusy(false);
        }
      }}
    >
      <LeadFields id="lr" {...{ name, setName, phone, setPhone, email, setEmail, err }} />
      <div>
        <label className="label" htmlFor="lr-msg">Message</label>
        <textarea id="lr-msg" className="input min-h-20 resize-y" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} />
      </div>
      <FormError msg={formError(err)} />
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />} {source === "payment_plan" ? "Send me the payment plan" : "Request a call back"}
      </button>
    </form>
  );
}

/** Brochure download that asks for a name and number first; the developer gets a "brochure" lead. */
export function BrochureButton({ projectId, projectName, url }: { projectId: string; projectName: string; url: string }) {
  const [open, setOpen] = useState(false);
  const me = useMe(open);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!me) return;
    setName((v) => v || me.name || "");
    setEmail((v) => v || me.email || "");
    setPhone((v) => v || localPhone(me.phone));
  }, [me]);
  return (
    <>
      {ready ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="btn-primary w-full">
          <FileText className="h-4 w-4" /> Open brochure
        </a>
      ) : (
        <button type="button" className="btn-outline w-full" onClick={() => setOpen(true)}>
          <FileText className="h-4 w-4" /> Download brochure
        </button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Get the brochure">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr(null);
            try {
              await api("/api/v1/leads", { body: { projectId, name, phone, email, source: "brochure", message: `Downloaded the ${projectName} brochure.` } });
              setReady(true);
              setOpen(false);
              window.open(url, "_blank", "noopener,noreferrer");
            } catch (e2) {
              setErr(e2);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="text-sm text-slate-500">Enter your details to download the {projectName} brochure. The developer may contact you with prices and availability.</p>
          <LeadFields id="br" {...{ name, setName, phone, setPhone, email, setEmail, err }} />
          <FormError msg={formError(err)} />
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Download
          </button>
        </form>
      </Modal>
    </>
  );
}
