import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CalendarDays, Check, ChevronRight, FileText, HardHat, MapPin, Wallet } from "lucide-react";
import { getProject } from "@propertyx/core";
import { PROJECT_STATUS_LABELS, areaPath, developerPath, formatPKR, describeSqft } from "@propertyx/shared";
import { db, getUser } from "@/lib/server";
import { ContactBox } from "@/components/directory/contact-box";
import { Stat } from "@/components/market/data-note";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };
const load = cache((slug: string) => getProject(db, slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) return { title: "Project not found" };
  return {
    title: `${d.project.name} — ${d.city.name} | prices & payment plans`,
    description: d.project.tagline ?? d.project.description.slice(0, 160),
    alternates: { canonical: `/project/${d.project.slug}` },
    openGraph: d.project.coverImage ? { images: [d.project.coverImage] } : undefined,
  };
}

const date = (v: string | null) => (v ? new Date(v).toLocaleDateString("en-PK", { month: "short", year: "numeric" }) : "—");

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const [d, user] = await Promise.all([load(slug), getUser()]);
  if (!d) notFound();
  const { project: p, developer, city, location, gallery, units, plans } = d;
  const images = [p.coverImage, ...gallery.map((g) => g.url)].filter((x, i, a): x is string => !!x && a.indexOf(x) === i).slice(0, 5);
  const amenities = p.amenities ?? [];
  const cheapest = units.length ? Math.min(...units.map((u) => u.priceFrom)) : p.minPrice;

  return (
    <div className="container-px py-8">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/projects" className="hover:text-brand-700">Projects</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/projects/${city.slug}`} className="hover:text-brand-700">{city.name}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-700">{p.name}</span>
      </nav>

      {images.length > 0 && (
        <div className="mt-4 grid h-64 gap-2 overflow-hidden rounded-2xl sm:h-96 sm:grid-cols-4 sm:grid-rows-2">
          {images.map((src, i) => (
            <div key={src} className={`relative bg-slate-100 ${i === 0 ? "sm:col-span-2 sm:row-span-2" : "hidden sm:block"}`}>
              <Image src={src} alt={i === 0 ? p.name : ""} fill priority={i === 0} sizes={i === 0 ? "(min-width:640px) 50vw, 100vw" : "25vw"} className="object-cover" />
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          <div>
            <span className="badge bg-brand-50 text-brand-800">{PROJECT_STATUS_LABELS[p.status]}</span>
            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{p.name}</h1>
            {p.tagline && <p className="mt-1 text-lg text-slate-600">{p.tagline}</p>}
            <p className="mt-2 flex items-center gap-1.5 text-slate-500">
              <MapPin className="h-4 w-4" /> {p.address ?? [location?.name, city.name].filter(Boolean).join(", ")}
              {location && (
                <Link href={areaPath(location.slug)} className="ml-2 text-sm font-semibold text-brand-700">Area guide</Link>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Starting from" value={cheapest ? formatPKR(cheapest) : "On request"} />
            <Stat label="Possession" value={date(p.expectedCompletion)} hint={p.launchDate ? `Launched ${date(p.launchDate)}` : undefined} />
            <Stat label="Units available" value={p.availableUnits != null ? `${p.availableUnits}${p.totalUnits ? ` / ${p.totalUnits}` : ""}` : "—"} />
            <Stat label="Construction" value={`${p.constructionProgress}%`} />
          </div>
          {p.approvalStatus && (
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <b>Approval status:</b> {p.approvalStatus}
            </p>
          )}

          {p.constructionProgress > 0 && (
            <section>
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1.5 font-semibold text-slate-700"><HardHat className="h-4 w-4" /> Construction progress</span>
                <span className="font-bold text-brand-700">{p.constructionProgress}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${p.constructionProgress}%` }} />
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xl font-bold">About the project</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-700">{p.description}</p>
          </section>

          {units.length > 0 && (
            <section className="card overflow-hidden">
              <h2 className="px-6 pt-6 text-xl font-bold">Units &amp; prices</h2>
              <div className="overflow-x-auto">
                <table className="mt-4 w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-2.5">Unit</th>
                      <th className="px-6 py-2.5">Size</th>
                      <th className="px-6 py-2.5">Beds</th>
                      <th className="px-6 py-2.5">Price</th>
                      <th className="px-6 py-2.5">Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {units.map((u) => (
                      <tr key={u.id}>
                        <td className="px-6 py-3">
                          <span className="font-semibold">{u.name}</span>
                          <span className="block text-xs capitalize text-slate-500">{u.type}</span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-3">{describeSqft(u.areaSqft)}</td>
                        <td className="px-6 py-3">{u.beds ?? "—"}</td>
                        <td className="whitespace-nowrap px-6 py-3 font-semibold">
                          {formatPKR(u.priceFrom)}
                          {u.priceTo && u.priceTo !== u.priceFrom ? ` – ${formatPKR(u.priceTo)}` : ""}
                        </td>
                        <td className="px-6 py-3">{u.availableUnits > 0 ? <span className="text-emerald-700">{u.availableUnits} left</span> : <span className="text-red-600">Sold out</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {plans.length > 0 && (
            <section>
              <h2 className="text-xl font-bold">Payment plans</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {plans.map((pl) => {
                  const base = cheapest ?? 0;
                  const down = (base * pl.downPaymentPct) / 100;
                  const possession = (base * pl.possessionPct) / 100;
                  const count = pl.frequency === "quarterly" ? Math.max(1, Math.floor(pl.durationMonths / 3)) : pl.durationMonths;
                  const each = base ? (base - down - possession - (base * pl.balloonPct) / 100) / count : 0;
                  return (
                    <div key={pl.id} className="card p-5">
                      <p className="flex items-center gap-2 font-bold"><Wallet className="h-4 w-4 text-brand-600" /> {pl.name}</p>
                      <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                        <li className="flex justify-between"><span>Down payment</span><b>{pl.downPaymentPct}%</b></li>
                        <li className="flex justify-between"><span>Duration</span><b>{pl.durationMonths} months, {pl.frequency}</b></li>
                        {pl.possessionPct > 0 && <li className="flex justify-between"><span>On possession</span><b>{pl.possessionPct}%</b></li>}
                        {base > 0 && <li className="flex justify-between border-t border-slate-100 pt-1.5"><span>On the cheapest unit</span><b>{formatPKR(Math.round(each))} / {pl.frequency === "quarterly" ? "quarter" : "month"}</b></li>}
                      </ul>
                      {pl.notes && <p className="mt-2 text-xs text-slate-500">{pl.notes}</p>}
                    </div>
                  );
                })}
              </div>
              <Link href="/tools/installment" className="mt-3 inline-block text-sm font-semibold text-brand-700">Plan your own installments →</Link>
            </section>
          )}

          {amenities.length > 0 && (
            <section>
              <h2 className="text-xl font-bold">Amenities</h2>
              <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
                {amenities.map((a) => (
                  <li key={a} className="flex items-center gap-2"><Check className="h-4 w-4 text-brand-600" /> {a}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Developer</p>
            <Link href={developerPath(developer.slug)} className="mt-1 block text-lg font-bold text-slate-900 hover:text-brand-700">{developer.name}</Link>
            {developer.establishedYear && <p className="text-sm text-slate-500">Since {developer.establishedYear}</p>}
            {d.isOwner ? (
              <Link href={`/dashboard/projects/${p.id}`} className="btn-primary mt-4 w-full">Edit project</Link>
            ) : (
              <div className="mt-4">
                <ContactBox to={developer.name} target={{ projectId: p.id }} defaultText={`Hi, I'm interested in ${p.name}. Please share the latest prices, availability and payment plan.`} loggedIn={!!user} next={`/project/${p.slug}`} />
              </div>
            )}
          </div>
          {(p.brochureUrl || p.masterPlanUrl) && (
            <div className="card space-y-2 p-5">
              {p.brochureUrl && <a href={p.brochureUrl} target="_blank" rel="noopener noreferrer" className="btn-outline w-full"><FileText className="h-4 w-4" /> Download brochure</a>}
              {p.masterPlanUrl && <a href={p.masterPlanUrl} target="_blank" rel="noopener noreferrer" className="btn-outline w-full"><CalendarDays className="h-4 w-4" /> View master plan</a>}
            </div>
          )}
          <p className="text-xs text-slate-400">Prices and plans are provided by the developer. Verify approvals and the NOC with the relevant authority before paying.</p>
        </aside>
      </div>
    </div>
  );
}
