import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil } from "lucide-react";
import { listProjects, myDeveloper, getActivePlan, hasCapability } from "@propertyx/core";
import { formatPKR, PROJECT_STATUS_LABELS } from "@propertyx/shared";
import { requirePermission, db } from "@/lib/server";
import { PageHeader, Empty } from "@/components/dashboard/ui";
import { StatusPill } from "@/components/badges";

export const metadata = { title: "Projects" };

export default async function ProjectsDash({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requirePermission("project.create", "/dashboard/projects");
  const [dev, plan] = await Promise.all([myDeveloper(db, user), getActivePlan(db, user.id)]);
  const { saved } = await searchParams;
  if (!dev)
    return (
      <div>
        <PageHeader title="Projects" />
        <Empty title="Create your developer profile first" body="Your company profile appears on every project page." action={<Link href="/dashboard/profile" className="btn-primary">Set up developer profile</Link>} />
      </div>
    );
  const projects = await listProjects(db, { developerId: dev.id, includeUnpublished: true });
  const canPublish = hasCapability(plan, "projects");
  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle={`${dev.name} · ${projects.length} project(s)`}
        actions={
          canPublish ? (
            <Link href="/dashboard/projects/new" className="btn-gold"><Plus className="h-4 w-4" /> New project</Link>
          ) : (
            <Link href="/pricing" className="btn-primary">Upgrade to the Developer plan to publish</Link>
          )
        }
      />
      {saved && <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Project saved. New projects are reviewed by our team before they are published.</p>}
      {projects.length === 0 ? (
        <Empty title="No projects yet" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <div key={p.id} className="card overflow-hidden">
              <div className="relative aspect-[16/8] bg-slate-100">{p.cover && <Image src={p.cover} alt="" fill sizes="50vw" className="object-cover" />}</div>
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <StatusPill status={p.publishStatus} />
                  <span className="badge bg-slate-100 text-slate-700">{PROJECT_STATUS_LABELS[p.status as keyof typeof PROJECT_STATUS_LABELS]}</span>
                </div>
                <p className="mt-2 text-lg font-bold">{p.name}</p>
                <p className="text-sm text-slate-500">{[p.locationName, p.cityName].filter(Boolean).join(", ")} · from {p.minPrice ? formatPKR(p.minPrice) : "—"}</p>
                <div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-brand-600" style={{ width: `${p.progress}%` }} /></div>
                <p className="mt-1 text-xs text-slate-500">{p.progress}% built · {p.availableUnits ?? 0} of {p.totalUnits ?? 0} units available</p>
                <div className="mt-4 flex gap-2">
                  <Link href={`/dashboard/projects/${p.id}`} className="btn-outline btn-sm"><Pencil className="h-3.5 w-3.5" /> Edit</Link>
                  <Link href={`/project/${p.slug}`} className="btn-ghost btn-sm">View page</Link>
                  <Link href="/dashboard/leads" className="btn-ghost btn-sm">Leads</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
