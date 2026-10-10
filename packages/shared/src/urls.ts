import type { Purpose } from "./constants";
import { TYPE_SLUGS } from "./constants";

/**
 * SEO URL scheme
 *   /buy/[type]/[city]/[location]        e.g. /buy/house/lahore/dha-lahore
 *   /rent/[type]/[city]/[location]       e.g. /rent/flat/islamabad
 *   /plots-for-sale/[city]/[location]
 *   /commercial-property/[city]/[location]
 *   /projects/[city]
 *   /area/[slug]
 *   /property/[slug]
 */
export function searchPath(opts: { purpose?: Purpose; typeSlug?: string; city?: string; location?: string }) {
  const purpose = opts.purpose ?? "sale";
  const t = opts.typeSlug;
  if (purpose === "sale" && (t === "plots" || t === "plot")) return ["/plots-for-sale", opts.city, opts.location].filter(Boolean).join("/");
  if (purpose === "sale" && t === "commercial") return ["/commercial-property", opts.city, opts.location].filter(Boolean).join("/");
  const base = purpose === "rent" ? "/rent" : "/buy";
  const parts = [base];
  if (t && t !== "property") parts.push(t);
  else if (opts.city) parts.push("property");
  if (opts.city) parts.push(opts.city);
  if (opts.city && opts.location) parts.push(opts.location);
  return parts.join("/");
}

/** Interpret path segments after /buy or /rent. */
export function parseSearchSegments(segments: string[] = []) {
  let typeSlug: string | undefined;
  let rest = segments;
  if (segments[0] && segments[0] in TYPE_SLUGS) {
    typeSlug = segments[0];
    rest = segments.slice(1);
  }
  return { typeSlug, city: rest[0], location: rest[1] };
}

export const listingPath = (slug: string) => `/property/${slug}`;
export const projectPath = (slug: string) => `/project/${slug}`;
export const areaPath = (slug: string) => `/area/${slug}`;
export const agentPath = (slug: string) => `/agents/${slug}`;
export const agencyPath = (slug: string) => `/agencies/${slug}`;
export const developerPath = (slug: string) => `/developers/${slug}`;
export const blogPath = (slug: string) => `/blog/${slug}`;

/**
 * Public base URL of the site: APP_URL if set, otherwise the production domain Vercel
 * provides to every deployment, otherwise the local dev server.
 */
export function publicAppUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3100";
}
