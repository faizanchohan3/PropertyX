"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";
import { ROLES, STAFF_ROLES } from "@propertyx/shared";
import { api } from "@/lib/client";
import { toast } from "../toast";

export function UserRoleEditor({ userId, roles, canStaff, canEdit }: { userId: string; roles: string[]; canStaff: boolean; canEdit: boolean }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const change = async (role: string, grant: boolean) => {
    if (!grant && !confirm(`Remove the ${role.replace("_", " ")} role?`)) return;
    try {
      await api("/api/v1/admin/user.role", { body: { userId, role, grant } });
      toast(grant ? "Role granted" : "Role removed");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  const available = ROLES.filter((r) => r.key !== "guest" && !roles.includes(r.key) && (canStaff || !STAFF_ROLES.includes(r.key)));
  return (
    <div className="flex flex-wrap items-center gap-1">
      {roles.map((r) => (
        <span key={r} className={`badge ${STAFF_ROLES.includes(r as never) ? "bg-gold-500/20 text-gold-300" : "bg-white/10 text-slate-300"}`}>
          {r.replace(/_/g, " ")}
          {canEdit && (canStaff || !STAFF_ROLES.includes(r as never)) && (
            <button onClick={() => change(r, false)} aria-label={`Remove ${r}`}>
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      {canEdit &&
        (adding ? (
          <select autoFocus className="rounded-md border border-white/10 bg-night-3 px-1 py-0.5 text-xs" defaultValue="" onBlur={() => setAdding(false)} onChange={(e) => e.target.value && change(e.target.value, true)}>
            <option value="">Add role…</option>
            {available.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        ) : (
          <button onClick={() => setAdding(true)} className="rounded-full p-0.5 text-slate-400 hover:bg-white/10" aria-label="Add role">
            <Plus className="h-3.5 w-3.5" />
          </button>
        ))}
    </div>
  );
}
