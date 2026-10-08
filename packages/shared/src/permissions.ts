/**
 * Role based access control. Roles are additive: a user can be e.g. a buyer and a
 * landlord at the same time. The matrix below is the source of truth and is also
 * synced into the `roles`, `permissions` and `role_permissions` tables by the seed /
 * `syncRbac()` so admins can audit it from the database.
 */

export const ROLES = [
  { key: "guest", label: "Guest", public: false },
  { key: "buyer", label: "Buyer", public: true },
  { key: "tenant", label: "Tenant", public: true },
  { key: "seller", label: "Seller", public: true },
  { key: "landlord", label: "Landlord", public: true },
  { key: "agent", label: "Property Agent", public: true },
  { key: "agency", label: "Real Estate Agency", public: true },
  { key: "developer", label: "Developer", public: true },
  { key: "investor", label: "Investor", public: true },
  { key: "property_manager", label: "Property Manager", public: true },
  { key: "construction_company", label: "Construction Company", public: true },
  { key: "support", label: "Customer Support", public: false },
  { key: "moderator", label: "Moderator", public: false },
  { key: "admin", label: "Admin", public: false },
  { key: "super_admin", label: "Super Admin", public: false },
] as const;
export type Role = (typeof ROLES)[number]["key"];
export const ROLE_KEYS = ROLES.map((r) => r.key) as unknown as readonly [Role, ...Role[]];
export const SELF_SERVICE_ROLES = ROLES.filter((r) => r.public).map((r) => r.key) as Role[];
export const STAFF_ROLES: Role[] = ["support", "moderator", "admin", "super_admin"];

export const PERMISSIONS = {
  "listing.create": "Post property listings",
  "listing.update.own": "Edit own listings",
  "listing.update.any": "Edit any listing",
  "listing.moderate": "Approve / reject listings",
  "lead.read.own": "Read leads for own listings",
  "lead.read.team": "Read leads for agency team",
  "message.send": "Send messages",
  "appointment.request": "Request property visits",
  "appointment.manage": "Accept / reject visit requests",
  "saved.manage": "Save properties and searches",
  "agency.manage": "Manage agency profile",
  "agency.members.manage": "Create and manage agency employees",
  "project.create": "Create new projects",
  "project.manage.any": "Manage any project",
  "review.create": "Write reviews",
  "review.respond": "Respond to reviews",
  "review.moderate": "Moderate reviews",
  "verification.request": "Request verification",
  "verification.review": "Approve / reject verification",
  "document.read.any": "Read private documents of others",
  "report.create": "Report listings, agents and fraud",
  "report.manage": "Handle reports",
  "fraud.manage": "Review fraud alerts",
  "user.read": "View user accounts",
  "user.suspend": "Suspend / reactivate users",
  "role.manage": "Assign staff roles",
  "content.manage": "Manage blog posts, guides and areas",
  "forum.post": "Post in the community forum",
  "forum.moderate": "Moderate the forum",
  "ads.create": "Create advertising campaigns",
  "ads.manage": "Approve and manage all campaigns",
  "subscription.purchase": "Purchase subscriptions",
  "billing.manage": "Manage plans, pricing and payments",
  "settings.manage": "Manage homepage, rates and platform settings",
  "rental.manage": "Manage rental properties, leases and tenants",
  "rental.tenant": "Access tenant portal",
  "analytics.own": "View own analytics",
  "analytics.platform": "View platform analytics",
  "audit.read": "Read audit logs",
  "admin.access": "Access admin panel",
  "support.access": "Access customer support tools",
} as const;
export type Permission = keyof typeof PERMISSIONS;

const BASE_USER: Permission[] = ["message.send", "appointment.request", "saved.manage", "review.create", "report.create", "forum.post", "verification.request"];
const LISTER: Permission[] = [...BASE_USER, "listing.create", "listing.update.own", "lead.read.own", "appointment.manage", "analytics.own", "subscription.purchase", "ads.create"];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  guest: [],
  buyer: BASE_USER,
  tenant: [...BASE_USER, "rental.tenant"],
  investor: BASE_USER,
  seller: LISTER,
  landlord: [...LISTER, "rental.manage"],
  agent: [...LISTER, "review.respond"],
  agency: [...LISTER, "review.respond", "agency.manage", "agency.members.manage", "lead.read.team"],
  developer: [...LISTER, "review.respond", "project.create"],
  property_manager: [...LISTER, "rental.manage"],
  construction_company: [...BASE_USER, "review.respond", "ads.create", "subscription.purchase", "analytics.own"],
  support: [...BASE_USER, "admin.access", "support.access", "user.read", "report.manage"],
  moderator: [...BASE_USER, "admin.access", "listing.moderate", "review.moderate", "forum.moderate", "report.manage", "fraud.manage", "user.read", "verification.review", "document.read.any"],
  admin: [] as Permission[], // filled below
  super_admin: [] as Permission[],
};
const ALL = Object.keys(PERMISSIONS) as Permission[];
ROLE_PERMISSIONS.admin = ALL.filter((p) => p !== "role.manage");
ROLE_PERMISSIONS.super_admin = ALL;

export function permissionsFor(roles: readonly string[]): Set<Permission> {
  const set = new Set<Permission>();
  for (const r of roles) for (const p of ROLE_PERMISSIONS[r as Role] ?? []) set.add(p);
  return set;
}

export function can(roles: readonly string[], permission: Permission): boolean {
  return permissionsFor(roles).has(permission);
}

export function isStaff(roles: readonly string[]) {
  return roles.some((r) => STAFF_ROLES.includes(r as Role));
}

/** Agency employee roles (separate from platform roles). */
export const AGENCY_MEMBER_ROLES = ["admin", "manager", "agent", "marketing"] as const;
export type AgencyMemberRole = (typeof AGENCY_MEMBER_ROLES)[number];
export const AGENCY_MEMBER_PERMISSIONS: Record<AgencyMemberRole, string[]> = {
  admin: ["members", "listings", "leads.all", "billing", "analytics", "deals", "settings"],
  manager: ["listings", "leads.all", "analytics", "deals"],
  agent: ["listings.own", "leads.own", "deals.own"],
  marketing: ["listings", "analytics", "ads"],
};
