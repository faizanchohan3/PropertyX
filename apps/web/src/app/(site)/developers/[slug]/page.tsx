import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BadgeCheck, Globe, HardHat } from "lucide-react";
import { getDeveloperProfile } from "@propertyx/core";
import { db, getUser } from "@/lib/server";
import { Avatar, ProjectCard, Rating } from "@/components/directory/cards";
import { ContactBox } from "@/components/directory/contact-box";
import { ReviewsList } from "@/components/directory/reviews";

type Props = { params: Promise<{ slug: string }> };
const load = cache((slug: string) => getDeveloperProfile(db, slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) return { title: "Developer not found" };
  return { title: `${d.developer.name} — projects & track record`, description: d.developer.description?.slice(0, 160) ?? `Projects by ${d.developer.name}.`, alternates: { canonical: `/developers/${d.developer.slug}` } };
}

export default async function DeveloperPage({ params }: Props) {
  const { slug } = await params;
  const [d, user] = await Promise.all([load(slug), getUser()]);
  if (!d) notFound();
  const { developer: dev, projects } = d;

  return (
    <div className="container-px py-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {dev.logoUrl ? <Avatar src={dev.logoUrl} name={dev.name} className="h-24 w-24 rounded-2xl" /> : <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gold-50 text-gold-600"><HardHat className="h-10 w-10" /></span>}
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-extrabold">
                {dev.name} {dev.verificationLevel >= 2 && <BadgeCheck className="h-6 w-6 text-brand-600" aria-label="Verified developer" />}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                {dev.establishedYear && <span>Since {dev.establishedYear}</span>}
                <span>{projects.length} {projects.length === 1 ? "project" : "projects"}</span>
                <Rating rating={dev.ratingAvg} reviews={dev.reviewsCount} />
              </div>
              {dev.website && (
                <a href={dev.website} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><Globe className="h-3.5 w-3.5" /> Website</a>
              )}
            </div>
          </div>

          {dev.description && (
            <section>
              <h2 className="text-xl font-bold">About</h2>
              <p className="mt-2 whitespace-pre-line text-slate-700">{dev.description}</p>
            </section>
          )}

          <section>
            <h2 className="mb-4 text-xl font-bold">Projects</h2>
            {projects.length === 0 ? (
              <p className="text-slate-500">No published projects yet.</p>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {projects.map((p) => (
                  <ProjectCard key={p.id} p={p} />
                ))}
              </div>
            )}
          </section>

          <ReviewsList type="developer" id={dev.id} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {dev.ownerId && dev.ownerId !== user?.id && (
            <div className="card p-5">
              <ContactBox to={dev.name} target={{ userId: dev.ownerId }} defaultText={`Hi, I'd like to know more about your projects and current payment plans.`} loggedIn={!!user} next={`/developers/${dev.slug}`} />
            </div>
          )}
          <p className="text-xs text-slate-400">Check approvals and the NOC with the relevant authority before booking.</p>
        </aside>
      </div>
    </div>
  );
}
