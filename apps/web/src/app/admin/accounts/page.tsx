import Link from "next/link";
import { asc } from "drizzle-orm";
import { UserPlus } from "lucide-react";
import { adminDirectory, type DirectoryKind } from "@propertyx/core";
import { agencies as agenciesTable } from "@propertyx/database";
import { requirePermission, db } from "@/lib/server";
import { allCities } from "@/lib/queries";
import { AdminHeader, AdminTabs, DarkPill, th, td, darkInput, okBtn, darkBtn } from "@/components/admin/ui";
import { CreateAccountForm } from "@/components/admin/create-account-form";

export const metadata = { title: "Agents, agencies & developers" };

const TABS: { key: DirectoryKind; label: string }[] = [
  { key: "agents", label: "Agents" },
  { key: "agencies", label: "Agencies" },
  { key: "developers", label: "Developers" },
];
const NEW_ROLE: Record<DirectoryKind, string> = { agents: "agent", agencies: "agency", developers: "developer" };

export default async function AdminAccounts({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; page?: string; new?: string }> }) {
  const user = await requirePermission("user.read", "/admin/accounts");
  const sp = await searchParams;
  const tab = (TABS.some((t) => t.key === sp.tab) ? sp.tab : "agents") as DirectoryKind;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const canCreate = user.permissions.includes("user.create");
  const showForm = canCreate && sp.new === "1";
  const [r, cities, agencyList] = await Promise.all([
    adminDirectory(db, user, tab, { q: sp.q, page }),
    showForm ? allCities() : Promise.resolve([]),
    showForm ? db.select({ id: agenciesTable.id, name: agenciesTable.name }).from(agenciesTable).orderBy(asc(agenciesTable.name)) : Promise.resolve([]),
  ]);
  const qs = (p: number) => `?tab=${tab}&q=${encodeURIComponent(sp.q ?? "")}&page=${p}`;
  const cols = tab === "agents" ? ["Agent", "Agency", "City", "Level", "Active listings", "Joined", "Status"] : tab === "agencies" ? ["Agency", "Owner", "City", "Level", "Agents", "Active listings", "Status"] : ["Developer", "Owner", "City", "Level", "Projects", "Joined", "Status"];

  return (
    <div>
      <AdminHeader
        title="Agents, agencies & developers"
        subtitle={`${r.total.toLocaleString()} ${tab}`}
        actions={canCreate && !showForm ? <Link href={`?tab=${tab}&new=1`} className={`${okBtn} px-3 py-2 text-sm`}><UserPlus className="h-4 w-4" /> Create account</Link> : null}
      />
      {showForm && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-semibold text-white">New account</p>
            <Link href={`?tab=${tab}`} className={darkBtn}>Close</Link>
          </div>
          <CreateAccountForm cities={cities.map((c) => ({ id: c.id, name: c.name }))} agencies={agencyList} initialRole={NEW_ROLE[tab]} />
        </div>
      )}
      <AdminTabs tabs={TABS} active={tab} param="tab" />
      <form className="mb-4 flex flex-wrap gap-2">
        <input type="hidden" name="tab" value={tab} />
        <input name="q" defaultValue={sp.q} placeholder="Name, email or phone" className={`${darkInput} max-w-sm`} />
        <button className={okBtn}>Search</button>
      </form>
      <div className="dark-panel overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-white/10"><tr>{cols.map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/5">
            {r.items.map((x) => (
              <tr key={x.id as string}>
                <td className={td}>
                  <span className="font-semibold text-white">{x.name as string}</span>
                  {x.is_seed ? <span className="ml-1 text-[10px] text-slate-500">demo</span> : null}
                  <p className="text-xs text-slate-500">{(x.email as string) ?? ""}{x.phone ? ` · ${(x.phone as string).replace("+92", "0")}` : ""}</p>
                </td>
                <td className={td}>{(x.parent as string) ?? "—"}</td>
                <td className={td}>{(x.city as string) ?? "—"}</td>
                <td className={td}>{x.verification_level as number}</td>
                {tab === "agencies" && <td className={td}>{x.agents as number}</td>}
                <td className={td}>{tab === "developers" ? (x.projects as number) : (x.active_listings as number)}</td>
                {tab !== "agencies" && <td className={td}>{new Date(x.created_at as string).toLocaleDateString("en-PK")}</td>}
                <td className={td}><DarkPill s={(x.status as string) ?? "active"} /></td>
              </tr>
            ))}
            {r.items.length === 0 && (
              <tr><td className={`${td} text-slate-500`} colSpan={cols.length}>Nothing found.</td></tr>
            )}
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
