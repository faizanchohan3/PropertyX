import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, Building2, HardHat, MapPin, Star, Users } from "lucide-react";
import { formatPKR, PROJECT_STATUS_LABELS, agentPath, agencyPath, developerPath, projectPath } from "@propertyx/shared";

export type ProjectCardData = { id: string; slug: string; name: string; status: string; cover: string | null; developerName: string; locationName: string | null; cityName: string; minPrice: number | null; minDownPct?: number | null; progress?: number };

export function ProjectCard({ p }: { p: ProjectCardData }) {
  return (
    <Link href={projectPath(p.slug)} className="card group overflow-hidden">
      <div className="relative aspect-[16/10] bg-slate-100">
        {p.cover && <Image src={p.cover} alt={p.name} fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105" />}
        <span className="badge absolute left-3 top-3 bg-white/95 text-slate-800">{PROJECT_STATUS_LABELS[p.status as keyof typeof PROJECT_STATUS_LABELS] ?? p.status}</span>
        {p.minDownPct != null && <span className="badge absolute right-3 top-3 bg-gold-500 text-white">{p.minDownPct}% down</span>}
      </div>
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">{p.developerName}</p>
        <p className="mt-1 text-lg font-bold text-slate-900 group-hover:text-brand-700">{p.name}</p>
        <p className="flex items-center gap-1 text-sm text-slate-500">
          <MapPin className="h-3.5 w-3.5" /> {[p.locationName, p.cityName].filter(Boolean).join(", ")}
        </p>
        {p.progress != null && p.progress > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Construction</span>
              <span>{p.progress}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-brand-600" style={{ width: `${p.progress}%` }} />
            </div>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
          <span className="text-slate-500">From</span>
          <span className="font-bold text-slate-900">{p.minPrice ? formatPKR(p.minPrice) : "On request"}</span>
        </div>
      </div>
    </Link>
  );
}

export function Avatar({ src, name, className = "h-14 w-14 text-lg" }: { src: string | null; name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return src ? <img src={src} alt="" className={`shrink-0 rounded-full object-cover ${className}`} /> : <span className={`flex shrink-0 items-center justify-center rounded-full bg-brand-700 font-bold text-white ${className}`}>{initials}</span>;
}

export function Rating({ rating, reviews }: { rating: number; reviews: number }) {
  if (!reviews) return <span className="text-xs text-slate-400">No reviews yet</span>;
  return (
    <span className="flex items-center gap-1 text-xs text-slate-600">
      <Star className="h-3.5 w-3.5 fill-gold-400 text-gold-400" /> <b className="text-slate-800">{rating.toFixed(1)}</b> ({reviews})
    </span>
  );
}

export type AgentCardData = { slug: string; name: string; photo: string | null; agencyName: string | null; cityName: string | null; verificationLevel: number; rating: number; reviews: number; activeListings: number; experienceYears: number | null; specializations: string[] };

export function AgentCard({ a }: { a: AgentCardData }) {
  return (
    <Link href={agentPath(a.slug)} className="card group flex flex-col p-5 hover:border-brand-300">
      <div className="flex items-center gap-3">
        <Avatar src={a.photo} name={a.name} />
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate font-bold text-slate-900 group-hover:text-brand-700">
            {a.name} {a.verificationLevel >= 2 && <BadgeCheck className="h-4 w-4 shrink-0 text-brand-600" aria-label="Verified" />}
          </p>
          <p className="truncate text-sm text-slate-500">{a.agencyName ?? "Independent agent"}</p>
          <Rating rating={a.rating} reviews={a.reviews} />
        </div>
      </div>
      {a.specializations.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {a.specializations.slice(0, 3).map((s) => (
            <span key={s} className="badge bg-slate-100 capitalize text-slate-600">{s.replace(/_/g, " ")}</span>
          ))}
        </div>
      )}
      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center text-xs text-slate-500">
        <span><b className="block text-sm text-slate-900">{a.activeListings}</b>Listings</span>
        <span><b className="block text-sm text-slate-900">{a.experienceYears ?? "—"}</b>Years</span>
        <span><b className="block truncate text-sm text-slate-900">{a.cityName ?? "—"}</b>City</span>
      </div>
    </Link>
  );
}

export type AgencyCardData = { slug: string; name: string; logo: string | null; cityName: string | null; verificationLevel: number; rating: number; reviews: number; agents: number; listings: number; established: number | null };

export function AgencyCard({ a }: { a: AgencyCardData }) {
  return (
    <Link href={agencyPath(a.slug)} className="card group flex flex-col p-5 hover:border-brand-300">
      <div className="flex items-center gap-3">
        {a.logo ? <Avatar src={a.logo} name={a.name} className="h-14 w-14 rounded-xl" /> : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Building2 className="h-6 w-6" /></span>}
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate font-bold text-slate-900 group-hover:text-brand-700">
            {a.name} {a.verificationLevel >= 2 && <BadgeCheck className="h-4 w-4 shrink-0 text-brand-600" aria-label="Verified" />}
          </p>
          <p className="text-sm text-slate-500">{[a.cityName, a.established && `since ${a.established}`].filter(Boolean).join(" · ")}</p>
          <Rating rating={a.rating} reviews={a.reviews} />
        </div>
      </div>
      <div className="mt-4 flex gap-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
        <span className="flex items-center gap-1"><Users className="h-4 w-4 text-slate-400" /> {a.agents} agents</span>
        <span className="flex items-center gap-1"><Building2 className="h-4 w-4 text-slate-400" /> {a.listings} listings</span>
      </div>
    </Link>
  );
}

export type DeveloperCardData = { slug: string; name: string; logo: string | null; cityName: string | null; verificationLevel: number; projects: number; established: number | null };

export function DeveloperCard({ d }: { d: DeveloperCardData }) {
  return (
    <Link href={developerPath(d.slug)} className="card group flex items-center gap-4 p-5 hover:border-brand-300">
      {d.logo ? <Avatar src={d.logo} name={d.name} className="h-14 w-14 rounded-xl" /> : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-600"><HardHat className="h-6 w-6" /></span>}
      <div className="min-w-0">
        <p className="flex items-center gap-1 truncate font-bold text-slate-900 group-hover:text-brand-700">
          {d.name} {d.verificationLevel >= 2 && <BadgeCheck className="h-4 w-4 shrink-0 text-brand-600" aria-label="Verified" />}
        </p>
        <p className="text-sm text-slate-500">{[d.cityName, d.established && `since ${d.established}`].filter(Boolean).join(" · ")}</p>
        <p className="text-sm font-semibold text-brand-700">{d.projects} {d.projects === 1 ? "project" : "projects"}</p>
      </div>
    </Link>
  );
}
