import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/data/types";
import { activeHref, moreTab, roleTabs } from "@/lib/sections";

/** iPhone-style bottom tab bar, phone widths only. "More" is active for any screen not in the role's four tabs. */
export function TabBar({ pathname, role }: { pathname: string; role: Role }) {
  const tabs = roleTabs[role];
  const active = activeHref(pathname, tabs.map((t) => t.href)) ?? moreTab.href;

  return (
    <nav
      aria-label="Tabs"
      className="frosted fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-black/[0.08] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:hidden print:hidden shadow-sheet"
    >
      {[...tabs, moreTab].map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.href === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 pb-1.5 pt-2 text-[11px] transition-all",
              isActive ? "font-semibold text-accent" : "text-ink-secondary hover:text-ink",
            )}
          >
            <span
              className={cn(
                "grid h-8 w-12 place-items-center rounded-xl transition-all",
                isActive ? "bg-accent-soft text-accent shadow-xs scale-105" : "text-ink-secondary",
              )}
            >
              <Icon size={19} strokeWidth={isActive ? 2.25 : 1.85} aria-hidden />
            </span>
            <span>{tab.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
