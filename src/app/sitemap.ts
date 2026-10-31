import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${siteUrl}/login`, changeFrequency: "yearly", priority: 1 }];
}
