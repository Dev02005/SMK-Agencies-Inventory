import type { Role } from "@/lib/data/types";
import { allRoles } from "@/lib/labels";

/**
 * Who may open each part of the app, by path; the longest matching path wins and anything not listed (Home,
 * Notifications, More, Settings › Account) is open to everyone signed in. proxy.ts checks it before any page renders
 * and the navigation shows the same, so a link nobody can use never appears.
 */
const access: [path: string, roles: Role[]][] = [
  ["/sales/lorries", ["owner"]],
  ["/sales", ["owner", "office", "field", "godown"]],
  ["/orders", ["owner", "office", "field", "godown"]],
  ["/quotations", ["owner", "office", "field"]],
  ["/purchases/lorries", ["owner"]],
  ["/purchases", ["owner", "office", "godown"]],
  ["/money/payments", ["owner", "office"]],
  ["/money/cash", ["owner", "office", "field"]],
  ["/money/expenses", ["owner", "office"]],
  ["/money/advances", ["owner", "office"]],
  ["/money/ageing", ["owner", "office"]],
  ["/money/banks", ["owner", "office"]],
  ["/money/bad-debts", ["owner"]],
  ["/money", ["owner", "office", "field"]],
  ["/parties", ["owner", "office", "field"]],
  ["/stock/lorries", ["owner"]],
  ["/stock", ["owner", "office", "godown"]],
  ["/people", ["owner"]],
  ["/fleet", ["owner"]],
  ["/reports", ["owner", "office"]],
  ["/personal", ["owner"]],
  ["/settings/users", ["owner"]],
  ["/settings/firm", ["owner", "office"]],
  ["/settings/godowns", ["owner", "office"]],
  ["/settings/products", ["owner", "office"]],
  ["/settings/reminders", ["owner", "office"]],
  ["/settings/lists", ["owner", "office"]],
];

const matches = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);

/** The roles that may open this path. */
export function rolesFor(pathname: string): Role[] {
  let best: [string, Role[]] | undefined;
  for (const entry of access) if (matches(pathname, entry[0]) && (!best || entry[0].length > best[0].length)) best = entry;
  return best?.[1] ?? allRoles;
}

/** Whether someone with this role may open the path. The owner may open everything (and previews the rest with View as). */
export function canOpen(role: Role, pathname: string): boolean {
  return role === "owner" || rolesFor(pathname).includes(role);
}
