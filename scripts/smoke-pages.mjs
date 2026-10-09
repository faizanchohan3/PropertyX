/**
 * Logs in as demo users and requests pages, reporting non-2xx/3xx responses.
 *   node scripts/smoke-pages.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? "http://localhost:3100";
const PASSWORD = "Demo@12345";

const PLAN = {
  agent: ["/dashboard", "/dashboard/listings", "/dashboard/leads", "/dashboard/appointments", "/dashboard/analytics", "/dashboard/billing", "/dashboard/verification", "/dashboard/reviews", "/dashboard/ads", "/dashboard/profile", "/messages", "/saved", "/alerts", "/account", "/account/notifications", "/post-property"],
  agency: ["/dashboard/team", "/dashboard/leads?scope=team", "/dashboard/analytics?view=agency", "/dashboard/profile"],
  seller: ["/dashboard/listings", "/dashboard/listings?status=rejected", "/dashboard/billing"],
  developer: ["/dashboard/projects", "/dashboard/projects/new", "/dashboard/analytics", "/dashboard/profile"],
  landlord: ["/dashboard/rentals", "/dashboard"],
  manager: ["/dashboard/rentals"],
  tenant: ["/dashboard/tenant", "/dashboard"],
  buyer: ["/dashboard", "/saved", "/alerts", "/messages", "/dashboard/appointments"],
  admin: ["/admin", "/admin/listings", "/admin/listings?tab=all", "/admin/listings?tab=all&q=DHA&status=active", "/admin/verification", "/admin/verification?status=all", "/admin/fraud", "/admin/reports", "/admin/reviews", "/admin/users", "/admin/users?role=agent", "/admin/projects", "/admin/areas", "/admin/areas?city=lahore", "/admin/content", "/admin/content/new", "/admin/forum", "/admin/ads", "/admin/billing", "/admin/billing?tab=plans", "/admin/billing?tab=subscriptions", "/admin/settings", "/admin/audit"],
  moderator: ["/admin", "/admin/listings", "/admin/fraud", "/admin/verification"],
};

async function login(email) {
  const res = await fetch(`${BASE}/api/v1/auth/login`, { method: "POST", headers: { "content-type": "application/json", origin: BASE }, body: JSON.stringify({ email, password: PASSWORD }) });
  if (!res.ok) throw new Error(`login ${email}: ${res.status} ${await res.text()}`);
  return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}

let failures = 0;
const only = process.argv[3];
for (const [role, pages] of Object.entries(PLAN)) {
  if (only && !only.split(",").includes(role)) continue;
  const list = pages;
  if (!list.length) continue;
  const cookie = await login(`${role}@bismillah.test`);
  for (const p of list) {
    const t = Date.now();
    const res = await fetch(`${BASE}${p}`, { headers: { cookie }, redirect: "manual" });
    const ok = res.status < 400;
    if (!ok) failures++;
    const body = ok ? "" : (await res.text()).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 300);
    console.log(`${ok ? "ok " : "ERR"} ${res.status} ${role.padEnd(9)} ${p} (${Date.now() - t}ms) ${body}`);
  }
}
console.log(failures ? `\n${failures} failure(s)` : "\nall pages OK");
process.exit(failures ? 1 : 0);
