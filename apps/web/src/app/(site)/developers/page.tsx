import { COUNTRY } from "@propertyx/shared";
import type { Metadata } from "next";
import Link from "next/link";
import { listDevelopers } from "@propertyx/core";
import { db } from "@/lib/server";
import { DeveloperCard } from "@/components/directory/cards";

export const metadata: Metadata = {
  title: `Property developers in ${COUNTRY.inName}`,
  description: `Builders and developers behind new housing and commercial projects in ${COUNTRY.inName}, with their projects and track record.`,
  alternates: { canonical: "/developers" },
};

export const revalidate = 3600;

export default async function DevelopersPage() {
  const rows = await listDevelopers(db);
  return (
    <div className="container-px py-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Developers</h1>
          <p className="mt-3 text-slate-500">The builders behind new projects, with everything they currently have on sale.</p>
        </div>
        <Link href="/projects" className="text-sm font-semibold text-brand-700">Browse projects →</Link>
      </div>
      {rows.length === 0 ? (
        <p className="card mt-6 p-10 text-center text-slate-500">No developers yet.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <DeveloperCard
              key={r.id as string}
              d={{ slug: r.slug as string, name: r.name as string, logo: (r.logo_url as string) ?? null, cityName: (r.city_name as string) ?? null, verificationLevel: Number(r.verification_level), projects: Number(r.projects), established: r.established_year ? Number(r.established_year) : null }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
