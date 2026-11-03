/** Public address used in page metadata, share previews, robots.txt and the sitemap. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

/** "SKA · <primary firm>", for page titles and share previews; the firm comes from Settings › Firm details. */
export const siteNameFor = (firmName: string) => `SKA · ${firmName}`;

export function siteDescriptionFor(firm: { name: string; address: string }) {
  return `${firm.name}${firm.address ? `, ${firm.address}` : ""}: wholesale cement and TMT steel. Staff sign in here for sales, money, stock and deliveries.`;
}
