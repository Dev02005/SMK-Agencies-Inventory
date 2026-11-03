/** Notification shape and per-person filter, kept apart from the data layer so the bell can use them in the browser. */
import type { Role } from "@/lib/data/types";

export type NoticeKind = "approval" | "dues" | "renewal" | "stock" | "order" | "cash" | "personal" | "delivery" | "lorry";

export type Notice = {
  /** Stable, so "read" survives a reload. */
  id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  href: string;
  date: string;
  tone: "danger" | "warning" | "accent" | "neutral";
  roles: Role[];
  /** Field staff and drivers see it only if it is theirs; the owner and office see every one. */
  forProfile?: string;
};

/** What one person sees: their role's notices, and for field staff and drivers only their own. */
export function noticesFor(notices: Notice[], role: Role, profileId: string) {
  const personal = role === "field" || role === "driver";
  return notices.filter((n) => n.roles.includes(role) && (!personal || !n.forProfile || n.forProfile === profileId));
}
