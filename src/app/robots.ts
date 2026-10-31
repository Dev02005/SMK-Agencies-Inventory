import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** Only the sign-in page is public; every other page holds business records and stays out of search results. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/login", "/opengraph-image"], disallow: "/" },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
