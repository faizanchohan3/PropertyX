"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Smartphone } from "lucide-react";
import { ROLES, SELF_SERVICE_ROLES } from "@propertyx/shared";
import { api, fieldError } from "@/lib/client";
import { FieldError, FormError } from "../modal";
import { toast } from "../toast";

export function ProfileForm({ initial, cities }: { initial: { name: string; bio: string; cityId: string | null; email: string }; cities: { id: string; name: string }[] }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          await api("/api/v1/account", { method: "PATCH", body: { name: f.name, bio: f.bio, cityId: f.cityId || null } });
          toast("Profile saved");
          router.refresh();
        } catch (e2) {
          setErr(e2);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="acc-name">Full name</label>
          <input id="acc-name" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="acc-email">Email</label>
          <input id="acc-email" className="input" value={f.email} disabled />
        </div>
        <div>
          <label className="label" htmlFor="acc-city">City</label>
          <select id="acc-city" className="input" value={f.cityId ?? ""} onChange={(e) => setF({ ...f, cityId: e.target.value || null })}>
            <option value="">—</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="acc-bio">About (optional)</label>
        <textarea id="acc-bio" className="input min-h-20" maxLength={1000} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />
      </div>
      <FormError msg={err instanceof Error ? err.message : null} />
      <button className="btn-primary" disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save profile
      </button>
    </form>
  );
}

export function PhoneVerify({ phone: initialPhone, verified }: { phone: string; verified: boolean }) {
  const router = useRouter();
  const [phone, setPhone] = useState(initialPhone);
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (verified && !sent)
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 font-semibold text-emerald-700">
          <CheckCircle2 className="h-5 w-5" /> {initialPhone} is verified
        </span>
        <button className="btn-ghost btn-sm" onClick={() => setSent(false)} hidden>
          Change
        </button>
      </div>
    );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input className="input max-w-xs" placeholder="0300 1234567" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Mobile number" />
        <button
          className="btn-outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setErr(null);
            try {
              const r = await api<{ devCode?: string }>("/api/v1/account/phone", { body: { phone } });
              setSent(true);
              setDevCode(r.devCode ?? null);
              toast("Code sent by SMS");
            } catch (e) {
              setErr((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Smartphone className="h-4 w-4" /> {sent ? "Resend code" : "Send code"}
        </button>
      </div>
      {sent && (
        <div className="flex flex-wrap gap-2">
          <input className="input max-w-[160px] font-mono tracking-widest" inputMode="numeric" maxLength={6} placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} aria-label="Verification code" />
          <button
            className="btn-primary"
            disabled={busy || code.length !== 6}
            onClick={async () => {
              setBusy(true);
              setErr(null);
              try {
                await api("/api/v1/account/phone", { method: "PUT", body: { phone, code } });
                toast("Phone verified");
                setSent(false);
                router.refresh();
              } catch (e) {
                setErr((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Verify
          </button>
        </div>
      )}
      {devCode && <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">Development mode (no SMS gateway configured): your code is <b className="font-mono">{devCode}</b></p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}

export function PasswordForm() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  return (
    <form
      className="grid max-w-xl gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          await api("/api/v1/account/password", { body: { current, next } });
          toast("Password changed. Please sign in again.");
          router.push("/login");
          router.refresh();
        } catch (e2) {
          setErr(e2);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <label className="label" htmlFor="pw-cur">Current password</label>
        <input id="pw-cur" type="password" autoComplete="current-password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      </div>
      <div>
        <label className="label" htmlFor="pw-new">New password</label>
        <input id="pw-new" type="password" autoComplete="new-password" className="input" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} />
        <FieldError msg={fieldError(err, "next")} />
      </div>
      <div className="sm:col-span-2">
        <FormError msg={err instanceof Error ? err.message : null} />
        <button className="btn-outline mt-1" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Change password & sign out everywhere
        </button>
      </div>
    </form>
  );
}

export function RolesForm({ roles }: { roles: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap gap-2">
      {ROLES.filter((r) => SELF_SERVICE_ROLES.includes(r.key) || roles.includes(r.key)).map((r) => {
        const has = roles.includes(r.key);
        return (
          <button
            key={r.key}
            disabled={has || busy === r.key}
            onClick={async () => {
              setBusy(r.key);
              try {
                await api("/api/v1/account/roles", { body: { role: r.key } });
                toast(`${r.label} features enabled`);
                router.refresh();
              } catch (e) {
                toast((e as Error).message, "error");
              } finally {
                setBusy(null);
              }
            }}
            className={`chip text-xs ${has ? "chip-active" : ""}`}
          >
            {has ? "✓ " : "+ "}
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

const CHANNELS = [
  ["in_app", "In-app"],
  ["email", "Email"],
  ["sms", "SMS"],
  ["whatsapp", "WhatsApp"],
  ["push", "Push"],
] as const;

export function NotificationPrefs({ items }: { items: { type: string; label: string; channels: Record<string, boolean> }[] }) {
  const [prefs, setPrefs] = useState(() => Object.fromEntries(items.map((i) => [i.type, i.channels])));
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="pb-3 font-semibold">Notification</th>
              {CHANNELS.map(([k, l]) => (
                <th key={k} className="pb-3 text-center font-semibold">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((i) => (
              <tr key={i.type}>
                <td className="py-3">{i.label}</td>
                {CHANNELS.map(([k]) => (
                  <td key={k} className="py-3 text-center">
                    <input type="checkbox" aria-label={`${i.label} via ${k}`} className="h-4 w-4 accent-brand-700" checked={!!prefs[i.type]?.[k]} onChange={(e) => setPrefs((p) => ({ ...p, [i.type]: { ...p[i.type], [k]: e.target.checked } }))} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">SMS and WhatsApp are only sent to a verified phone number. Security notifications are always delivered in-app.</p>
      <button
        className="btn-primary mt-4"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api("/api/v1/account/notifications", { method: "PUT", body: prefs });
            toast("Preferences saved");
          } catch (e) {
            toast((e as Error).message, "error");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save preferences
      </button>
    </div>
  );
}
