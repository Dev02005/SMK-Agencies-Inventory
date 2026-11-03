import type { MetadataRoute } from "next";
import { getFirm } from "@/lib/data";
import { siteNameFor } from "@/lib/site";

/** The installed app's name and description follow the primary firm (Settings › Firm details). */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const firm = await getFirm();
  return {
    id: "/",
    name: siteNameFor(firm.name),
    short_name: "SKA",
    description: `Sales, money, stock, staff and personal records for ${firm.name}.`,
    lang: "en-IN",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    // Opening the app again (or a shortcut) reuses the window that is already open.
    launch_handler: { client_mode: "focus-existing" },
    prefer_related_applications: false,
    background_color: "#f5f5f7",
    theme_color: "#f5f5f7",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    // Long-press the installed icon for these.
    shortcuts: [
      { name: "New bill", short_name: "Bill", url: "/sales/new", icons: [{ src: "/icon/192", sizes: "192x192" }] },
      { name: "Record receipt", short_name: "Receipt", url: "/money/receipts/new", icons: [{ src: "/icon/192", sizes: "192x192" }] },
      { name: "Notifications", short_name: "Alerts", url: "/notifications", icons: [{ src: "/icon/192", sizes: "192x192" }] },
    ],
  };
}
