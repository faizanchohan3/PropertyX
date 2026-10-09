"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { api, fieldError } from "@/lib/client";
import { toast } from "../toast";
import { darkInput, okBtn, darkBtn } from "./ui";

const ROLE_OPTIONS = [
  { key: "agent", label: "Property Agent" },
  { key: "agency", label: "Real Estate Agency" },
  { key: "developer", label: "Developer" },
  { key: "construction_company", label: "Construction Company" },
  { key: "property_manager", label: "Property Manager" },
  { key: "landlord", label: "Landlord" },
  { key: "seller", label: "Owner / Seller" },
  { key: "buyer", label: "Buyer" },
];

function makePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return `${Array.from(bytes, (b) => chars[b % chars.length]).join("")}@${(bytes[0] % 90) + 10}`;
}

export function CreateAccountForm({ cities, agencies, initialRole = "agent" }: { cities: { id: string; name: string }[]; agencies: { id: string; name: string }[]; initialRole?: string }) {
  const router = useRouter();
  const [f, setF] = useState({ role: ROLE_OPTIONS.some((r) => r.key === initialRole) ? initialRole : "agent", name: "", email: "", phone: "", password: makePassword(), agencyName: "", companyName: "", agencyId: "", cityId: "", verificationLevel: "0" });
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api("/api/v1/admin/account.create", {
        body: {
          ...f,
          phone: f.phone || undefined,
          agencyName: f.role === "agency" ? f.agencyName : undefined,
          companyName: f.role === "developer" || f.role === "construction_company" ? f.companyName : undefined,
          agencyId: f.role === "agent" ? f.agencyId : undefined,
        },
      });
      toast("Account created");
      setCreated({ email: f.email.trim().toLowerCase(), password: f.password });
      setF({ ...f, name: "", email: "", phone: "", password: makePassword(), agencyName: "", companyName: "" });
      router.refresh();
    } catch (e) {
      setErr(e);
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, name: string, el: React.ReactNode, hint?: string) => (
    <label className="block space-y-1 text-xs text-slate-400">
      <span>{label}</span>
      {el}
      {fieldError(err, name) ? <span className="block text-red-400">{fieldError(err, name)}</span> : hint ? <span className="block text-slate-500">{hint}</span> : null}
    </label>
  );

  return (
    <form onSubmit={submit} className="dark-panel space-y-4 p-5">
      {created && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          Account created. Share these sign-in details with the owner and ask them to change the password: <span className="font-mono text-white">{created.email}</span> / <span className="font-mono text-white">{created.password}</span>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {field("Account type", "role", <select className={darkInput} value={f.role} onChange={set("role")}>{ROLE_OPTIONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}</select>)}
        {f.role === "agency" && field("Agency name", "agencyName", <input className={darkInput} value={f.agencyName} onChange={set("agencyName")} placeholder="e.g. Crescent Estate" required />)}
        {(f.role === "developer" || f.role === "construction_company") && field("Company name", "companyName", <input className={darkInput} value={f.companyName} onChange={set("companyName")} placeholder="e.g. Al-Noor Builders" required />)}
        {f.role === "agent" &&
          field(
            "Agency (optional)",
            "agencyId",
            <select className={darkInput} value={f.agencyId} onChange={set("agencyId")}>
              <option value="">Independent agent</option>
              {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>,
          )}
        {field(f.role === "agency" || f.role === "developer" || f.role === "construction_company" ? "Owner / contact person" : "Full name", "name", <input className={darkInput} value={f.name} onChange={set("name")} required />)}
        {field("Email (used to sign in)", "email", <input type="email" className={darkInput} value={f.email} onChange={set("email")} required />)}
        {field("Mobile number", "phone", <input className={darkInput} value={f.phone} onChange={set("phone")} placeholder="03XX XXXXXXX" />)}
        {field("City", "cityId", <select className={darkInput} value={f.cityId} onChange={set("cityId")}><option value="">—</option>{cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>)}
        {field(
          "Temporary password",
          "password",
          <span className="flex gap-2">
            <input className={`${darkInput} font-mono`} value={f.password} onChange={set("password")} required />
            <button type="button" className={darkBtn} onClick={() => setF({ ...f, password: makePassword() })} aria-label="Generate a new password"><RefreshCw className="h-3.5 w-3.5" /></button>
          </span>,
          "Share it with the owner; they can change it from their account page.",
        )}
        {field(
          "Verification level",
          "verificationLevel",
          <select className={darkInput} value={f.verificationLevel} onChange={set("verificationLevel")}>
            <option value="0">0 — Not verified</option>
            <option value="1">1 — Phone verified</option>
            <option value="2">2 — Identity verified</option>
            <option value="3">3 — Documents verified</option>
            <option value="4">4 — Location verified</option>
            <option value="5">5 — Premium verified</option>
          </select>,
          "Only set a level you have actually checked.",
        )}
      </div>
      <button className={`${okBtn} px-4 py-2 text-sm`} disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create account
      </button>
    </form>
  );
}
