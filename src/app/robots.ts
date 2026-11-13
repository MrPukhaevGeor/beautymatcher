import type { MetadataRoute } from "next";
import { isDemo } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  if (isDemo()) return { rules: { userAgent: "*", disallow: "/" } };
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/cabinet", "/provider", "/login", "/api/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
