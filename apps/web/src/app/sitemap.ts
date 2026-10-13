import type { MetadataRoute } from "next";
import { sql } from "drizzle-orm";
import { publicAppUrl } from "@propertyx/shared";
import { db } from "@/lib/server";
import { CITY_LINKS } from "@/components/nav-data";

export const revalidate = 3600;

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v ? new Date(String(v)) : undefined);

/** Public pages for search engines: static pages, city/area searches and every live listing, project and profile. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicAppUrl();
  const now = new Date();
  const staticPaths = ["", "/buy", "/rent", "/projects", "/agents", "/agencies", "/developers", "/areas", "/map", "/ai", "/tools", "/tools/home-loan", "/tools/property-value", "/tools/investment", "/tools/area-unit-converter", "/price-index", "/trends", "/invest", "/blog", "/forum", "/pricing", "/sell", "/help", "/safety", "/terms", "/privacy"];
  const out: MetadataRoute.Sitemap = staticPaths.map((p) => ({ url: `${base}${p}`, lastModified: now, changeFrequency: p === "" ? "daily" : "weekly", priority: p === "" ? 1 : 0.6 }));
  for (const c of CITY_LINKS) {
    out.push({ url: `${base}/buy/property/${c.slug}`, changeFrequency: "daily", priority: 0.7 }, { url: `${base}/rent/property/${c.slug}`, changeFrequency: "daily", priority: 0.7 });
  }
  const q = async (query: ReturnType<typeof sql>) => {
    try {
      return (await db.execute<Row>(query)) as unknown as Row[];
    } catch {
      return [];
    }
  };
  const [listings, areas, projects, agents, agencies, developers, posts] = await Promise.all([
    q(sql`select slug, updated_at from property_listings where status = 'active' order by updated_at desc limit 20000`),
    q(sql`select slug from locations where kind in ('city', 'area', 'society') and active_listings > 0 order by active_listings desc limit 2000`),
    q(sql`select slug, updated_at from projects where publish_status = 'published' limit 2000`),
    q(sql`select slug, updated_at from agents limit 5000`),
    q(sql`select slug, updated_at from agencies limit 2000`),
    q(sql`select slug, updated_at from developers limit 1000`),
    q(sql`select slug, updated_at from blog_posts where status = 'published' limit 2000`),
  ]);
  listings.forEach((r) => out.push({ url: `${base}/property/${r.slug}`, lastModified: iso(r.updated_at), changeFrequency: "weekly", priority: 0.8 }));
  areas.forEach((r) => out.push({ url: `${base}/area/${r.slug}`, changeFrequency: "weekly", priority: 0.6 }));
  projects.forEach((r) => out.push({ url: `${base}/project/${r.slug}`, lastModified: iso(r.updated_at), priority: 0.7 }));
  agents.forEach((r) => out.push({ url: `${base}/agents/${r.slug}`, lastModified: iso(r.updated_at), priority: 0.4 }));
  agencies.forEach((r) => out.push({ url: `${base}/agencies/${r.slug}`, lastModified: iso(r.updated_at), priority: 0.4 }));
  developers.forEach((r) => out.push({ url: `${base}/developers/${r.slug}`, lastModified: iso(r.updated_at), priority: 0.4 }));
  posts.forEach((r) => out.push({ url: `${base}/blog/${r.slug}`, lastModified: iso(r.updated_at), priority: 0.5 }));
  return out;
}
