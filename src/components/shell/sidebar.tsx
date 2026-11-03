import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/data/types";
import { activeHref, sidebarGroups, toneClasses } from "@/lib/sections";

export function Sidebar({ pathname, role, firmName }: { pathname: string; role: Role; firmName: string }) {
  const groups = sidebarGroups
    .map((group) => ({ ...group, items: group.items.filter((s) => s.roles.includes(role)) }))
    .filter((group) => group.items.length > 0);
  const active = activeHref(
    pathname,
    groups.flatMap((g) => g.items.map((s) => s.href)),
  );

  return (
    <aside aria-label="Sidebar" className="fixed inset-y-0 left-[env(safe-area-inset-left)] z-20 hidden print:!hidden w-[72px] flex-col overflow-y-auto border-r border-hairline bg-page px-3 py-4 md:flex lg:w-60">
      <Link href="/" aria-label={`${firmName}, home`} className="mb-4 flex items-center gap-3 rounded-xl px-1.5 py-1.5">
        <Image src="/icon.svg" alt="" width={34} height={34} unoptimized className="rounded-[9px]" />
        <span className="hidden min-w-0 lg:block">
          <span className="line-clamp-2 text-[14px] font-semibold leading-[18px] tracking-[-0.2px] text-ink">{firmName}</span>
        </span>
      </Link>

      <nav aria-label="Main" className="flex flex-col">
        {groups.map((group, i) => (
          <div key={group.label ?? i} className="mt-3 first:mt-0">
            {group.label && (
              <div className="mb-1 hidden px-3 text-[12px] text-ink-tertiary lg:block">{group.label}</div>
            )}
            {group.items.map((section) => {
              const Icon = section.icon;
              const isActive = section.href === active;
              return (
                <Link
                  key={section.href}
                  href={section.href}
                  title={section.title}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center justify-center gap-3 rounded-xl px-3 text-[15px] transition-colors lg:justify-start",
                    isActive
                      ? "bg-card font-semibold text-ink shadow-card"
                      : "text-ink-secondary hover:bg-card/70 hover:text-ink",
                  )}
                >
                  {/* Each section keeps its colour, as on the module cards. */}
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg", toneClasses[section.tone])}>
                    <Icon size={16} strokeWidth={2} aria-hidden />
                  </span>
                  <span className="hidden truncate lg:inline">{section.title}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
