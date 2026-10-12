import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import { listProjects } from "@propertyx/core";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, UNIT_TYPES, COUNTRY } from "@propertyx/shared";
import { db } from "@/lib/server";
import { CITY_LINKS } from "@/components/nav-data";
import { ProjectCard } from "@/components/directory/cards";

type Props = { params: Promise<{ city?: string[] }>; searchParams: Promise<{ city?: string; status?: string; unit?: string; q?: string }> };

const cityName = (slug?: string) => CITY_LINKS.find((c) => c.slug === slug)?.name;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const name = cityName(city?.[0]);
  return {
    title: name ? `New projects in ${name}` : `New projects in ${COUNTRY.inName}`,
    description: `Apartments, villas and plots in new housing projects${name ? ` in ${name}` : " across ${COUNTRY.inName}"}, with payment plans, construction progress and developer details.`,
    alternates: { canonical: name ? `/projects/${city![0]}` : "/projects" },
  };
}

export default async function ProjectsPage({ params, searchParams }: Props) {
  const { city: seg } = await params;
  const sp = await searchParams;
  if (seg && seg.length > 1) notFound();
  if (seg?.[0] && !cityName(seg[0])) notFound();
  // the filter form sends ?city=; the SEO path is /projects/[city]
  const city = seg?.[0] ?? (cityName(sp.city) ? sp.city : undefined);
  const status = PROJECT_STATUSES.includes(sp.status as never) ? sp.status : undefined;
  const unit = UNIT_TYPES.includes(sp.unit as never) ? sp.unit : undefined;
  const q = sp.q?.trim().slice(0, 80) || undefined;
  const projects = await listProjects(db, { city, status, unitType: unit, q });

  return (
    <div className="container-px py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">New projects{city ? ` in ${cityName(city)}` : ""}</h1>
        <p className="mt-3 text-slate-500">Apartments, villas, shops and plots in new developments, with payment plans and construction progress.</p>
      </div>
      <form action="/projects" className="card mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        <input name="q" defaultValue={q ?? ""} className="input" placeholder="Project or developer name" aria-label="Project or developer name" />
        <select name="city" defaultValue={city ?? ""} className="input" aria-label="City">
          <option value="">All cities</option>
          {CITY_LINKS.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ""} className="input" aria-label="Status">
          <option value="">Any status</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select name="unit" defaultValue={unit ?? ""} className="input" aria-label="Unit type">
          <option value="">Any unit type</option>
          {UNIT_TYPES.map((u) => (
            <option key={u} value={u} className="capitalize">{u[0].toUpperCase() + u.slice(1)}s</option>
          ))}
        </select>
        <button className="btn-primary">
          <Search className="h-4 w-4" /> Search
        </button>
      </form>
      <p className="mt-6 text-sm text-slate-500">{projects.length} {projects.length === 1 ? "project" : "projects"}</p>
      {projects.length === 0 ? (
        <p className="card mt-4 p-10 text-center text-slate-500">No projects match your search. Try another city or clear the filters.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
