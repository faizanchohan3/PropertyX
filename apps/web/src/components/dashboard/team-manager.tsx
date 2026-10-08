"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, Copy } from "lucide-react";
import { AGENCY_MEMBER_ROLES } from "@propertyx/shared";
import { api, fieldError } from "@/lib/client";
import { Modal, FieldError, FormError } from "../modal";
import { toast } from "../toast";

type Member = { user_id: string; role: string; status: string; name: string; email: string; phone: string | null; last_login_at: string | null; listings: number; leads_30d: number; won: number; agent_slug: string | null };

const ROLE_HELP: Record<string, string> = { admin: "Full control incl. team & billing", manager: "All listings, leads and analytics", agent: "Own listings and leads", marketing: "Listings, analytics and ads" };

function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(10);
  crypto.getRandomValues(arr);
  return [...arr].map((n) => chars[n % chars.length]).join("") + "7a";
}

export function TeamManager({ members, myRole, seats, myId }: { members: Member[]; myRole: string; seats: number; myId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", email: "", phone: "", role: "agent", temporaryPassword: tempPassword() });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const admin = myRole === "admin";
  const add = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api("/api/v1/agency/members", { body: f });
      toast(`${f.name} added. Share the temporary password securely.`);
      setOpen(false);
      setF({ name: "", email: "", phone: "", role: "agent", temporaryPassword: tempPassword() });
      router.refresh();
    } catch (e) {
      setErr(e);
    } finally {
      setBusy(false);
    }
  };
  const update = async (userId: string, body: Record<string, string>) => {
    try {
      await api(`/api/v1/agency/members/${userId}`, { method: "PATCH", body });
      toast("Team member updated");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {members.length} of {seats} seats used
        </p>
        {admin && (
          <button onClick={() => setOpen(true)} disabled={members.length >= seats} className="btn-primary" title={members.length >= seats ? "Upgrade your plan for more seats" : undefined}>
            <UserPlus className="h-4 w-4" /> Add team member
          </button>
        )}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              {["Member", "Role", "Listings", "Leads (30d)", "Won", "Last active", ""].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((m) => (
              <tr key={m.user_id} className={m.status === "disabled" ? "opacity-50" : ""}>
                <td className="px-4 py-3">
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-xs text-slate-500">{m.email}</p>
                </td>
                <td className="px-4 py-3">
                  {admin && m.user_id !== myId ? (
                    <select aria-label="Role" className="input w-auto py-1.5 text-xs" value={m.role} onChange={(e) => update(m.user_id, { role: e.target.value })}>
                      {AGENCY_MEMBER_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="capitalize">{m.role}</span>
                  )}
                  <p className="mt-0.5 text-[11px] text-slate-400">{ROLE_HELP[m.role]}</p>
                </td>
                <td className="px-4 py-3">{m.listings}</td>
                <td className="px-4 py-3">{m.leads_30d}</td>
                <td className="px-4 py-3">{m.won}</td>
                <td className="px-4 py-3 text-slate-500">{m.last_login_at ? new Date(m.last_login_at).toLocaleDateString("en-PK") : "Never"}</td>
                <td className="px-4 py-3 text-right">
                  {admin && m.user_id !== myId && (
                    <button onClick={() => update(m.user_id, { status: m.status === "disabled" ? "active" : "disabled" })} className={`btn-ghost btn-sm ${m.status === "disabled" ? "text-brand-700" : "text-red-600"}`}>
                      {m.status === "disabled" ? "Re-enable" : "Disable"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Add team member">
        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="tm-name">Full name</label>
            <input id="tm-name" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <FieldError msg={fieldError(err, "name")} />
          </div>
          <div>
            <label className="label" htmlFor="tm-email">Work email</label>
            <input id="tm-email" type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <FieldError msg={fieldError(err, "email")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="tm-phone">Mobile</label>
              <input id="tm-phone" className="input" placeholder="03XX XXXXXXX" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
              <FieldError msg={fieldError(err, "phone")} />
            </div>
            <div>
              <label className="label" htmlFor="tm-role">Role</label>
              <select id="tm-role" className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
                {AGENCY_MEMBER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="tm-pass">Temporary password</label>
            <div className="flex gap-2">
              <input id="tm-pass" className="input font-mono" value={f.temporaryPassword} onChange={(e) => setF({ ...f, temporaryPassword: e.target.value })} />
              <button type="button" className="btn-outline px-3" onClick={() => navigator.clipboard.writeText(f.temporaryPassword).then(() => toast("Copied"))} aria-label="Copy password">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">Share it privately; they'll be asked to change it after signing in.</p>
          </div>
          <FormError msg={err instanceof Error ? err.message : null} />
          <button onClick={add} disabled={busy} className="btn-primary w-full">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create account
          </button>
        </div>
      </Modal>
    </div>
  );
}
