import type { AuthUser } from "@propertyx/auth";

export interface DashNavItem {
  href: string;
  label: string;
  icon: string;
  show: (u: AuthUser, ctx: { hasAgency: boolean; isDeveloper: boolean; isTenant: boolean }) => boolean;
}

const has = (u: AuthUser, p: string) => u.permissions.includes(p as never);

export const DASH_NAV: { title: string; items: DashNavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard", show: () => true },
      { href: "/dashboard/analytics", label: "Analytics", icon: "BarChart3", show: (u) => has(u, "analytics.own") },
    ],
  },
  {
    title: "Selling & renting",
    items: [
      { href: "/dashboard/listings", label: "My listings", icon: "Building2", show: (u) => has(u, "listing.create") },
      { href: "/dashboard/leads", label: "Leads", icon: "Users", show: (u) => has(u, "lead.read.own") },
      { href: "/dashboard/appointments", label: "Visits", icon: "CalendarDays", show: () => true },
      { href: "/messages", label: "Messages", icon: "MessageSquare", show: () => true },
      { href: "/dashboard/ads", label: "Advertising", icon: "Megaphone", show: (u) => has(u, "ads.create") },
    ],
  },
  {
    title: "Business",
    items: [
      { href: "/dashboard/team", label: "Agency team", icon: "UsersRound", show: (_u, c) => c.hasAgency },
      { href: "/dashboard/projects", label: "Projects", icon: "HardHat", show: (u, c) => has(u, "project.create") || c.isDeveloper },
      { href: "/dashboard/profile", label: "Public profile", icon: "IdCard", show: (u) => u.roles.some((r) => ["agent", "agency", "developer"].includes(r)) },
      { href: "/dashboard/reviews", label: "Reviews", icon: "Star", show: (u) => has(u, "review.respond") },
    ],
  },
  {
    title: "Rentals",
    items: [
      { href: "/dashboard/rentals", label: "Property management", icon: "KeyRound", show: (u) => has(u, "rental.manage") },
      { href: "/dashboard/tenant", label: "My tenancy", icon: "Home", show: (u, c) => has(u, "rental.tenant") || c.isTenant },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/saved", label: "Saved properties", icon: "Heart", show: () => true },
      { href: "/alerts", label: "Saved searches", icon: "BellRing", show: () => true },
      { href: "/dashboard/verification", label: "Verification", icon: "ShieldCheck", show: () => true },
      { href: "/dashboard/billing", label: "Plan & billing", icon: "CreditCard", show: (u) => has(u, "subscription.purchase") },
      { href: "/account", label: "Settings", icon: "Settings", show: () => true },
    ],
  },
];
