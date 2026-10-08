import Link from "next/link";
import Image from "next/image";
import { Plus, Eye, Heart, Users, AlertCircle } from "lucide-react";
import { listMyListings, getActivePlan, gatewaysForCheckout } from "@propertyx/core";
import { formatPKR, LISTING_STATUS_LABELS } from "@propertyx/shared";
import { requirePermission, db } from "@/lib/server";
import { PageHeader, Tabs, Empty, fmtDate } from "@/components/dashboard/ui";
import { StatusPill, VerificationBadge } from "@/components/badges";
import { ListingActions } from "@/components/dashboard/listing-actions";

export const metadata = { title: "My listings" };

export default async function MyListings({ searchParams }: { searchParams: Promise<{ status?: string; created?: string }> }) {
  const user = await requirePermission("listing.create", "/dashboard/listings");
  const { status = "all", created } = await searchParams;
  const [{ items, counts }, plan] = await Promise.all([listMyListings(db, user, { status }), getActivePlan(db, user.id)]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const creditsLeft = plan.subscription ? Math.max(0, plan.featuredQuota - plan.subscription.featuredCreditsUsed) : 0;
  const gateways = gatewaysForCheckout();
  const tabs = [{ key: "all", label: "All", count: total }, ...(["active", "pending_review", "draft", "paused", "rejected", "expired", "sold", "rented"] as const).map((k) => ({ key: k, label: LISTING_STATUS_LABELS[k], count: counts[k] ?? 0 }))];
  return (
    <div>
      <PageHeader
        title="My listings"
        subtitle={`${(counts.active ?? 0) + (counts.pending_review ?? 0)} of ${plan.listingQuota} listing slots used on the ${plan.name} plan${creditsLeft ? ` · ${creditsLeft} featured credits left` : ""}`}
        actions={
          <Link href="/post-property" className="btn-gold">
            <Plus className="h-4 w-4" /> New listing
          </Link>
        }
      />
      {created && <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Listing saved. Track its status below.</p>}
      <Tabs tabs={tabs} active={status} base="/dashboard/listings" />
      {items.length === 0 ? (
        <Empty title="Nothing here yet" body="Listings you create appear here with their status, views and leads." action={<Link href="/post-property" className="btn-primary">Post a property</Link>} />
      ) : (
        <div className="space-y-3">
          {items.map((l) => (
            <div key={l.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <Link href={`/property/${l.slug}`} className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-36">
                {l.coverUrl && <Image src={l.coverUrl} alt="" fill sizes="144px" className="object-cover" />}
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={l.status} />
                  {l.isFeatured && <span className="badge bg-gold-500 text-white">Featured</span>}
                  <VerificationBadge level={l.verificationLevel} />
                  <span className="text-xs text-slate-400">{l.referenceCode}</span>
                </div>
                <p className="mt-1 truncate font-semibold text-slate-900">{l.title}</p>
                <p className="text-sm text-slate-500">
                  {formatPKR(l.price)}
                  {l.purpose === "rent" ? "/mo" : ""} · {l.locationFullName}
                </p>
                {l.rejectionReason && l.status === "rejected" && (
                  <p className="mt-1 flex items-start gap-1 text-xs text-red-600">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {l.rejectionReason}
                  </p>
                )}
                {l.status === "active" && l.expiresAt && <p className="mt-0.5 text-xs text-slate-400">Expires {fmtDate(l.expiresAt)}</p>}
              </div>
              <div className="flex items-center gap-5 text-sm text-slate-600">
                <span className="flex items-center gap-1" title="Views">
                  <Eye className="h-4 w-4 text-slate-400" /> {l.viewsCount}
                </span>
                <span className="flex items-center gap-1" title="Saves">
                  <Heart className="h-4 w-4 text-slate-400" /> {l.savesCount}
                </span>
                <Link href={`/dashboard/leads?listing=${l.id}`} className="flex items-center gap-1" title="Leads">
                  <Users className="h-4 w-4 text-slate-400" /> {l.leadsCount}
                  {l.newLeads > 0 && <span className="badge bg-red-600 text-white">{l.newLeads} new</span>}
                </Link>
                <div className="hidden w-16 sm:block" title="Listing quality score">
                  <div className="h-1.5 rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${l.qualityScore}%` }} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-400">Quality {l.qualityScore}</p>
                </div>
                <ListingActions id={l.id} slug={l.slug} status={l.status} purpose={l.purpose} featuredCreditsLeft={creditsLeft} gateways={gateways} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
