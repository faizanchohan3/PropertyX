import Link from "next/link";
import { searchUsers } from "@propertyx/core";
import { ROLES } from "@propertyx/shared";
import { requirePermission, db } from "@/lib/server";
import { AdminHeader, DarkPill, th, td, darkInput, okBtn, darkBtn, badBtn } from "@/components/admin/ui";
import { AdminAction } from "@/components/admin/admin-action";
import { UserRoleEditor } from "@/components/admin/user-role-editor";

export const metadata = { title: "Users" };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; status?: string; page?: string }> }) {
  const user = await requirePermission("user.read", "/admin/users");
  const sp = await searchParams;
  const page = Number(sp.page ?? 1);
  const r = await searchUsers(db, user, { q: sp.q, role: sp.role || undefined, status: sp.status || undefined, page });
  const canSuspend = user.permissions.includes("user.suspend");
  const canStaff = user.permissions.includes("role.manage");
  const qs = (p: number) => `?q=${sp.q ?? ""}&role=${sp.role ?? ""}&status=${sp.status ?? ""}&page=${p}`;
  return (
    <div>
      <AdminHeader title="Users" subtitle={`${r.total.toLocaleString()} accounts`} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Name, email or phone" className={`${darkInput} max-w-sm`} />
        <select name="role" defaultValue={sp.role ?? ""} className={`${darkInput} w-auto`}>
          <option value="">All roles</option>
          {ROLES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
        </select>
        <select name="status" defaultValue={sp.status ?? ""} className={`${darkInput} w-auto`}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button className={okBtn}>Filter</button>
      </form>
      <div className="dark-panel overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b border-white/10"><tr>{["User", "Roles", "Level", "Listings", "Joined", "Last login", "Status", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/5">
            {r.items.map((u) => (
              <tr key={u.id as string}>
                <td className={td}><p className="font-semibold text-white">{u.name as string}{u.is_seed ? <span className="ml-1 text-[10px] text-slate-500">demo</span> : null}</p><p className="text-xs text-slate-500">{u.email as string}{u.phone ? ` · ${(u.phone as string).replace("+92", "0")}` : ""}</p></td>
                <td className={td}><UserRoleEditor userId={u.id as string} roles={u.roles as string[]} canStaff={canStaff} canEdit={canSuspend} /></td>
                <td className={td}>{u.verification_level as number}</td>
                <td className={td}>{u.listings as number}</td>
                <td className={td}>{new Date(u.created_at as string).toLocaleDateString("en-PK")}</td>
                <td className={td}>{u.last_login_at ? new Date(u.last_login_at as string).toLocaleDateString("en-PK") : "—"}</td>
                <td className={td}><DarkPill s={u.status as string} /></td>
                <td className={td}>
                  {canSuspend && u.id !== user.id && (u.status === "suspended" ? (
                    <AdminAction action="user.status" payload={{ userId: u.id, status: "active" }} label="Reactivate" className={okBtn} />
                  ) : (
                    <AdminAction action="user.status" payload={{ userId: u.id, status: "suspended" }} label="Suspend" className={badBtn} promptFor={{ key: "reason", label: "Reason (shown to the user)" }} promptRequired confirmText="Suspending signs the user out and pauses their listings. Continue?" />
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex gap-2">
        {page > 1 && <Link className={darkBtn} href={qs(page - 1)}>Previous</Link>}
        {page * 50 < r.total && <Link className={darkBtn} href={qs(page + 1)}>Next</Link>}
      </div>
    </div>
  );
}
