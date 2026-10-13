import type { MetadataRoute } from "next";
import { publicAppUrl } from "@propertyx/shared";

export default function robots(): MetadataRoute.Robots {
  const base = publicAppUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/dashboard", "/account", "/messages", "/saved", "/alerts", "/checkout", "/post-property", "/login", "/register"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
