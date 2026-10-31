"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/data/types";
import { useViewAs } from "@/lib/roles";

export type SubNavItem = { href: string; label: string; roles?: Role[] };

type SubNavProps = { items: SubNavItem[]; label: string; trailing?: ReactNode };

/**
 * Pill tabs under a section's title (People…); scrolls sideways on phones.
 * The URL is request data under Cache Components, so the highlight streams in; the fallback is the same tabs without it.
 */
export function SubNav(props: SubNavProps) {
  return (
    <Suspense fallback={<SubNavTabs {...props} pathname="" />}>
      <SubNavForPath {...props} />
    </Suspense>
  );
}

function SubNavForPath(props: SubNavProps) {
  return <SubNavTabs {...props} pathname={usePathname()} />;
}

function SubNavTabs({ items, label, trailing, pathname }: SubNavProps & { pathname: string }) {
  const [role] = useViewAs();
  const visible = items.filter((i) => !i.roles || i.roles.includes(role));
  const active = visible
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="mb-5 flex items-center gap-2 print:hidden">
      <nav aria-label={label} className="no-scrollbar -mx-4 flex flex-1 gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {visible.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.href === active ? "page" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center rounded-full px-4 text-[14px] transition-colors",
              t.href === active ? "bg-accent-soft font-medium text-accent" : "border border-hairline bg-card text-ink-secondary hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {trailing}
    </div>
  );
}

/** Shows its children only to the given roles (sample-mode "View as"); the database enforces the same rule. */
export function RoleGuard({ roles, children, fallback }: { roles: Role[]; children: ReactNode; fallback?: ReactNode }) {
  const [role] = useViewAs();
  if (roles.includes(role)) return <>{children}</>;
  return (
    <>
      {fallback ?? (
        <div className="surface px-6 py-12 text-center text-[15px] text-ink-secondary">This part is only for the owner and the office.</div>
      )}
    </>
  );
}
