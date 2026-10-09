import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireUser, db } from "@/lib/server";
import { AdminNav, type AdminNavItem } from "@/components/admin/admin-nav";

export const metadata = { title: { default: "Admin", template: "%s · Admin | Bismillah" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/admin");
  if (!user.permissions.includes("admin.access")) redirect("/dashboard?denied=1");
  const [c] = await db.execute<Record<string, number>>(sql`
    select (select count(*)::int from property_listings where status = 'pending_review') as listings,
      (select count(*)::int from verification_requests where status = 'pending') as verification,
      (select count(*)::int from fraud_flags where status = 'open' and severity in ('high','critical')) as fraud,
      (select count(*)::int from reports where status = 'open') as reports,
      (select count(*)::int from reviews where status = 'pending') as reviews,
      (select count(*)::int from projects where publish_status = 'pending') as projects,
      (select count(*)::int from advertisements where status = 'pending') as ads`);
  const p = (x: string) => user.permissions.includes(x as never);
  const items: (AdminNavItem & { show: boolean })[] = [
    { href: "/admin", label: "Overview", icon: "LayoutDashboard", show: true },
    { href: "/admin/listings", label: "Listings", icon: "Building2", count: c.listings, alert: c.listings > 0, show: p("listing.moderate") },
    { href: "/admin/verification", label: "Verification", icon: "ShieldCheck", count: c.verification, alert: c.verification > 0, show: p("verification.review") },
    { href: "/admin/fraud", label: "Fraud alerts", icon: "ShieldAlert", count: c.fraud, alert: c.fraud > 0, show: p("fraud.manage") },
    { href: "/admin/reports", label: "Reports", icon: "Flag", count: c.reports, alert: c.reports > 0, show: p("report.manage") },
    { href: "/admin/reviews", label: "Reviews", icon: "Star", count: c.reviews, show: p("review.moderate") },
    { href: "/admin/users", label: "Users", icon: "Users", show: p("user.read") },
    { href: "/admin/accounts", label: "Agents & developers", icon: "Briefcase", show: p("user.read") },
    { href: "/admin/projects", label: "Projects", icon: "HardHat", count: c.projects, show: p("project.manage.any") },
    { href: "/admin/areas", label: "Areas & guides", icon: "MapPinned", show: p("content.manage") },
    { href: "/admin/content", label: "Content (CMS)", icon: "Newspaper", show: p("content.manage") },
    { href: "/admin/forum", label: "Forum", icon: "MessagesSquare", show: p("forum.moderate") },
    { href: "/admin/ads", label: "Advertising", icon: "Megaphone", count: c.ads, show: p("ads.manage") },
    { href: "/admin/billing", label: "Plans & payments", icon: "CreditCard", show: p("billing.manage") },
    { href: "/admin/settings", label: "Settings", icon: "Settings", show: p("settings.manage") },
    { href: "/admin/audit", label: "Audit log", icon: "ScrollText", show: p("audit.read") },
  ];
  return (
    <div className="min-h-dvh bg-[#0d1424] text-slate-200 lg:flex">
      <AdminNav items={items.filter((i) => i.show).map(({ show: _s, ...i }) => i)} user={{ name: user.name, roles: user.roles }} />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
