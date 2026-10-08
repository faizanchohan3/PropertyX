import Link from "next/link";
import { auditLog } from "@propertyx/core";
import { requirePermission, db } from "@/lib/server";
import { AdminHeader, th, td, darkInput, okBtn, darkBtn } from "@/components/admin/ui";

export const metadata = { title: "Audit log" };

export default async function AdminAudit({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await requirePermission("audit.read", "/admin/audit");
  const sp = await searchParams;
  const page = Number(sp.page ?? 1);
  const rows = await auditLog(db, user, { q: sp.q, page });
  return (
    <div>
      <AdminHeader title="Audit log" subtitle="Security-relevant actions: sign-ins, moderation, role changes, document access, payments and settings." />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Filter by action, entity or person" className={`${darkInput} max-w-md`} />
        <button className={okBtn}>Filter</button>
      </form>
      <div className="dark-panel overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-white/10"><tr>{["When", "Who", "Action", "Entity", "Details", "IP"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/5 font-mono text-xs">
            {rows.map((r) => (
              <tr key={r.id as string}>
                <td className={`${td} whitespace-nowrap text-slate-400`}>{new Date(r.created_at as string).toLocaleString("en-PK")}</td>
                <td className={td}>{(r.actor_name as string) ?? "system"}</td>
                <td className={`${td} text-gold-300`}>{r.action as string}</td>
                <td className={td}>{r.entity_type as string}<p className="text-slate-500">{(r.entity_id as string)?.slice(0, 8)}</p></td>
                <td className={`${td} max-w-sm truncate text-slate-400`}>{JSON.stringify(r.metadata ?? {})}</td>
                <td className={`${td} text-slate-500`}>{(r.ip as string) ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex gap-2">
        {page > 1 && <Link className={darkBtn} href={`?q=${sp.q ?? ""}&page=${page - 1}`}>Newer</Link>}
        {rows.length === 100 && <Link className={darkBtn} href={`?q=${sp.q ?? ""}&page=${page + 1}`}>Older</Link>}
      </div>
    </div>
  );
}
