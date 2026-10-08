"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { api, fieldError } from "@/lib/client";
import { FieldError, FormError } from "./modal";

const DEMO = [
  ["Buyer", "buyer"],
  ["Seller", "seller"],
  ["Agent", "agent"],
  ["Agency", "agency"],
  ["Developer", "developer"],
  ["Landlord", "landlord"],
  ["Tenant", "tenant"],
  ["Prop. manager", "manager"],
  ["Admin", "admin"],
  ["Moderator", "moderator"],
  ["Super admin", "superadmin"],
] as const;

function safeNext(n: string | null) {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
}

export function LoginForm({ showDemo }: { showDemo: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const submit = async (e?: React.FormEvent, creds?: { email: string; password: string }) => {
    e?.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api("/api/v1/auth/login", { body: creds ?? { email, password } });
      router.push(safeNext(sp.get("next")));
      router.refresh();
    } catch (e) {
      setErr(e);
      setBusy(false);
    }
  };
  return (
    <div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <div className="relative">
            <input id="password" type={show ? "text" : "password"} autoComplete="current-password" className="input pr-10" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <FormError msg={err instanceof Error ? err.message : null} />
        <button className="btn-primary w-full py-3" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">
        New to PropertyX?{" "}
        <Link href={`/register${sp.get("next") ? `?next=${encodeURIComponent(sp.get("next")!)}` : ""}`} className="font-semibold text-brand-700">
          Create an account
        </Link>
      </p>
      {showDemo && (
        <div className="mt-8 rounded-2xl border border-dashed border-gold-300 bg-gold-50 p-4">
          <p className="text-sm font-semibold text-gold-900">Demo accounts</p>
          <p className="mb-3 text-xs text-gold-800">One click signs in as a sample user (password Demo@12345). Available only while demo mode is on.</p>
          <div className="flex flex-wrap gap-1.5">
            {DEMO.map(([label, key]) => (
              <button key={key} type="button" disabled={busy} onClick={() => submit(undefined, { email: `${key}@propertyx.test`, password: "Demo@12345" })} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-gold-200 hover:ring-gold-400">
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const ROLE_OPTIONS = [
  { key: "buyer", label: "Buy or rent a property" },
  { key: "seller", label: "Sell my property" },
  { key: "landlord", label: "Rent out & manage my property" },
  { key: "tenant", label: "I'm a tenant" },
  { key: "investor", label: "Invest in property" },
  { key: "agent", label: "I'm a property agent" },
  { key: "agency", label: "I run a real estate agency" },
  { key: "developer", label: "I'm a developer / builder" },
  { key: "property_manager", label: "I manage properties" },
  { key: "construction_company", label: "Construction company" },
];

export function RegisterForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", role: "buyer", agencyName: "", companyName: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const [agree, setAgree] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api("/api/v1/auth/register", { body: { ...f, phone: f.phone || undefined, agencyName: f.agencyName || undefined, companyName: f.companyName || undefined } });
      router.push(safeNext(sp.get("next")) === "/dashboard" ? "/dashboard?welcome=1" : safeNext(sp.get("next")));
      router.refresh();
    } catch (e) {
      setErr(e);
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="role">I want to</label>
        <select id="role" className="input" value={f.role} onChange={set("role")}>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="name">Full name</label>
        <input id="name" className="input" autoComplete="name" value={f.name} onChange={set("name")} required />
        <FieldError msg={fieldError(err, "name")} />
      </div>
      {f.role === "agency" && (
        <div>
          <label className="label" htmlFor="agency">Agency name</label>
          <input id="agency" className="input" value={f.agencyName} onChange={set("agencyName")} required />
        </div>
      )}
      {(f.role === "developer" || f.role === "construction_company") && (
        <div>
          <label className="label" htmlFor="company">Company name</label>
          <input id="company" className="input" value={f.companyName} onChange={set("companyName")} required />
        </div>
      )}
      <div>
        <label className="label" htmlFor="remail">Email</label>
        <input id="remail" type="email" autoComplete="email" className="input" value={f.email} onChange={set("email")} required />
        <FieldError msg={fieldError(err, "email")} />
      </div>
      <div>
        <label className="label" htmlFor="phone">Mobile number (optional)</label>
        <input id="phone" className="input" autoComplete="tel" placeholder="03XX XXXXXXX" value={f.phone} onChange={set("phone")} />
        <FieldError msg={fieldError(err, "phone")} />
      </div>
      <div>
        <label className="label" htmlFor="rpass">Password</label>
        <input id="rpass" type="password" autoComplete="new-password" className="input" value={f.password} onChange={set("password")} required minLength={8} />
        <p className="mt-1 text-xs text-slate-500">At least 8 characters with letters and numbers.</p>
        <FieldError msg={fieldError(err, "password")} />
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-700" required />
        <span>
          I agree to the{" "}
          <Link href="/terms" className="text-brand-700 underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-brand-700 underline">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      <FormError msg={err instanceof Error && !fieldError(err, "email") && !fieldError(err, "password") ? err.message : null} />
      <button className="btn-primary w-full py-3" disabled={busy || !agree}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create account
      </button>
      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-700">
          Sign in
        </Link>
      </p>
    </form>
  );
}
