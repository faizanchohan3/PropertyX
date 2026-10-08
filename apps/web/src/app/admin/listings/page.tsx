import Link from "next/link";
import Image from "next/image";
import { inArray, and, eq } from "drizzle-orm";
import { fraudFlags } from "@propertyx/database";
import { moderationQueue, adminListings } from "@propertyx/core";
import { formatPKR } from "@propertyx/shared";
import { requirePermission, db } from "@/lib/server";
import { AdminHeader, AdminTabs, DarkCard, Sev, DarkPill, th, td, darkInput, darkBtn, okBtn, badBtn } from "@/components/admin/ui";
import { AdminAction, AdminSelect } from "@/components/admin/admin-action";
import { Check, X, Pause } from "lucide-react";

export const metadata = { title: "Listings" };

export default async function AdminListings({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; status?: string; page?: string }> }) {
  const user = await requirePermission("listing.moderate", "/admin/listings");
  const sp = await searchParams;
  const tab = sp.tab ?? "queue";
  return (
    <div>
      <AdminHeader title="Listings" subtitle="Approve new listings, act on fraud signals and manage any listing." />
      <AdminTabs param="tab" active={tab} tabs={[{ key: "queue", label: "Review queue" }, { key: "all", label: "All listings" }]} />
      {tab === "queue" ? <Queue user={user} /> : <All user={user} q={sp.q} status={sp.status} page={Number(sp.page ?? 1)} />}
    </div>
  );
}

async function Queue({ user }: { user: Parameters<typeof moderationQueue>[1] }) {
  const items = await moderationQueue(db, user);
  const flags = items.length ? await db.select().from(fraudFlags).where(and(eq(fraudFlags.targetType, "listing"), eq(fraudFlags.status, "open"), inArray(fraudFlags.targetId, items.map((i) => i.id)))) : [];
  if (!items.length) return <DarkCard><p className="text-sm text-slate-400">The review queue is empty. 🎉</p></DarkCard>;
  return (
    <div className="space-y-4">
      {items.map((l) => {
        const f = flags.filter((x) => x.targetId === l.id);
        return (
          <DarkCard key={l.id}>
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl bg-night-3 md:w-56">{l.coverUrl && <Image src={l.coverUrl} alt="" fill sizes="224px" className="object-cover" />}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400">{l.referenceCode}</span>
                  {l.fraudScore > 0 && <span className={`badge ${l.fraudScore >= 60 ? "bg-red-600 text-white" : l.fraudScore >= 30 ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-slate-300"}`}>Risk {l.fraudScore}</span>}
                  <span className="badge bg-white/10 text-slate-300">Poster level {l.posterLevel}</span>
                </div>
                <Link href={`/property/${l.slug}`} target="_blank" className="mt-1 block font-bold text-white hover:text-gold-300">{l.title}</Link>
                <p className="text-sm text-slate-400">{formatPKR(l.price)}{l.purpose === "rent" ? "/mo" : ""} · {l.locationFullName} · by {l.posterName}</p>
                <p className="mt-2 line-clamp-3 text-sm text-slate-300">{l.description}</p>
                {f.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {f.map((x) => (
                      <li key={x.id} className="flex items-start gap-2 text-sm"><Sev s={x.severity} /> <span className="text-slate-300">{x.summary}</span></li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex shrink-0 gap-2 md:flex-col">
                <AdminAction action="listing.moderate" payload={{ id: l.id, decision: "approve" }} label="Approve" className={okBtn} icon={<Check className="h-3.5 w-3.5" />} done="Approved — poster notified" />
                <AdminAction action="listing.moderate" payload={{ id: l.id, decision: "reject" }} label="Reject" className={badBtn} icon={<X className="h-3.5 w-3.5" />} promptFor={{ key: "reason", label: "Reason shown to the poster" }} promptRequired done="Rejected — poster notified" />
              </div>
            </div>
          </DarkCard>
        );
      })}
    </div>
  );
}

async function All({ user, q, status, page }: { user: Parameters<typeof adminListings>[1]; q?: string; status?: string; page: number }) {
  const r = await adminListings(db, user, { q, status, page });
  return (
    <div>
      <form className="mb-4 flex flex-wrap gap-2">
        <input type="hidden" name="tab" value="all" />
        <input name="q" defaultValue={q} placeholder="Title, reference, poster email or phone" className={`${darkInput} max-w-md`} />
        <select name="status" defaultValue={status ?? "all"} className={`${darkInput} w-auto`}>
          {["all", "active", "pending_review", "draft", "paused", "rejected", "expired", "sold", "rented"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <button className={okBtn}>Search</button>
      </form>
      <p className="mb-2 text-xs text-slate-400">{r.total.toLocaleString()} listings</p>
      <div className="dark-panel overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b border-white/10"><tr>{["Listing", "Price", "Poster", "Status", "Risk", "Verification", "Actions"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-white/5">
            {r.items.map((l) => (
              <tr key={l.id}>
                <td className={td}><Link href={`/property/${l.slug}`} target="_blank" className="font-semibold text-white hover:text-gold-300">{l.title}</Link><p className="text-xs text-slate-500">{l.referenceCode} · {l.locationFullName}{l.isSeed ? " · demo" : ""}</p></td>
                <td className={td}>{formatPKR(l.price)}</td>
                <td className={td}><p>{l.posterName}</p><p className="text-xs text-slate-500">{l.posterEmail}</p></td>
                <td className={td}><DarkPill s={l.status} />{l.isFeatured && <span className="badge ml-1 bg-gold-500/20 text-gold-300">featured</span>}</td>
                <td className={td}>{l.fraudScore}</td>
                <td className={td}><AdminSelect action="listing.update" payload={{ id: l.id }} field="verificationLevel" value={String(l.verificationLevel)} label="Verification level" options={[0, 1, 2, 3, 4, 5].map((n) => ({ v: String(n), l: `Level ${n}` }))} /></td>
                <td className={td}>
                  <div className="flex flex-wrap gap-1.5">
                    {l.isFeatured ? <AdminAction action="listing.update" payload={{ id: l.id, unfeature: true }} label="Unfeature" className={darkBtn} /> : <AdminAction action="listing.update" payload={{ id: l.id, featuredDays: 7 }} label="Feature 7d" className={darkBtn} />}
                    {l.status === "active" && <AdminAction action="listing.update" payload={{ id: l.id, status: "paused" }} label="Pause" className={darkBtn} icon={<Pause className="h-3 w-3" />} />}
                    {l.status !== "rejected" && <AdminAction action="listing.update" payload={{ id: l.id, status: "rejected" }} label="Remove" className={badBtn} promptFor={{ key: "reason", label: "Reason (sent to poster)" }} promptRequired />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex gap-2">
        {page > 1 && <Link className={darkBtn} href={`?tab=all&q=${q ?? ""}&status=${status ?? "all"}&page=${page - 1}`}>Previous</Link>}
        {page * 50 < r.total && <Link className={darkBtn} href={`?tab=all&q=${q ?? ""}&status=${status ?? "all"}&page=${page + 1}`}>Next</Link>}
      </div>
    </div>
  );
}
