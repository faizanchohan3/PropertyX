import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BadgeCheck, Building2, Globe, MapPin } from "lucide-react";
import { getAgencyProfile } from "@propertyx/core";
import { agentPath } from "@propertyx/shared";
import { db, getUser } from "@/lib/server";
import { Avatar, Rating } from "@/components/directory/cards";
import { ContactBox } from "@/components/directory/contact-box";
import { LeadRequestBox } from "@/components/directory/lead-request";
import { ReviewsList } from "@/components/directory/reviews";
import { PropertyGrid } from "@/components/property-card";

type Props = { params: Promise<{ slug: string }> };
const load = cache((slug: string) => getAgencyProfile(db, slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) return { title: "Agency not found" };
  return { title: `${d.agency.name} — real estate agency${d.city ? ` in ${d.city.name}` : ""}`, description: d.agency.description?.slice(0, 160) ?? `Agents and listings from ${d.agency.name}.`, alternates: { canonical: `/agencies/${d.agency.slug}` } };
}

export default async function AgencyPage({ params }: Props) {
  const { slug } = await params;
  const [d, user] = await Promise.all([load(slug), getUser()]);
  if (!d) notFound();
  const { agency: ag, city, agents, listings, totalListings } = d;

  return (
    <div className="container-px py-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {ag.logoUrl ? <Avatar src={ag.logoUrl} name={ag.name} className="h-24 w-24 rounded-2xl" /> : <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Building2 className="h-10 w-10" /></span>}
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-extrabold">
                {ag.name} {ag.verificationLevel >= 2 && <BadgeCheck className="h-6 w-6 text-brand-600" aria-label="Verified agency" />}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                {(ag.address || city) && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {[ag.address, city?.name].filter(Boolean).join(", ")}</span>}
                {ag.establishedYear && <span>Since {ag.establishedYear}</span>}
                <Rating rating={ag.ratingAvg} reviews={ag.reviewsCount} />
              </div>
              {ag.website && (
                <a href={ag.website} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><Globe className="h-3.5 w-3.5" /> Website</a>
              )}
            </div>
          </div>

          {ag.description && (
            <section>
              <h2 className="text-xl font-bold">About</h2>
              <p className="mt-2 whitespace-pre-line text-slate-700">{ag.description}</p>
            </section>
          )}

          {agents.length > 0 && (
            <section>
              <h2 className="text-xl font-bold">Our agents ({agents.length})</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {agents.map((a) => (
                  <Link key={a.id} href={agentPath(a.slug)} className="card group flex items-center gap-3 p-4 hover:border-brand-300">
                    <Avatar src={a.photoUrl} name={a.displayName} className="h-11 w-11 text-sm" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 truncate font-semibold group-hover:text-brand-700">
                        {a.displayName} {a.verificationLevel >= 2 && <BadgeCheck className="h-4 w-4 shrink-0 text-brand-600" />}
                      </span>
                      <Rating rating={a.ratingAvg} reviews={a.reviewsCount} />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {listings.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-bold">Listings ({totalListings})</h2>
              <PropertyGrid items={listings} cols={3} />
            </section>
          )}

          <ReviewsList type="agency" id={ag.id} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {ag.ownerId && ag.ownerId !== user?.id && (
            <div className="card p-5">
              <LeadRequestBox target={{ agencyId: ag.id }} to={ag.name} defaultMessage={`Hi, I found ${ag.name} on Bismillah and I'm looking for a property. Can you help?`} />
              <p className="my-4 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />or send a message<span className="h-px flex-1 bg-slate-200" /></p>
              <ContactBox to={ag.name} target={{ userId: ag.ownerId }} defaultText={`Hi, I found ${ag.name} on Bismillah and I'm looking for a property. Can you help?`} loggedIn={!!user} next={`/agencies/${ag.slug}`} />
            </div>
          )}
          <p className="text-xs text-slate-400">Never pay advance money before visiting a property and checking its documents.</p>
        </aside>
      </div>
    </div>
  );
}
