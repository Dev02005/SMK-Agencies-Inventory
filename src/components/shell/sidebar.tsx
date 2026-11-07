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
        <Image src="/icon-512.png" alt="" width={36} height={36} unoptimized className="rounded-[10px] object-contain shrink-0 shadow-xs" />
        <span className="hidden min-w-0 lg:block">
          <span className="line-clamp-2 text-[14px] font-semibold leading-[18px] tracking-[-0.2px] text-ink">{firmName}</span>
        </span>
      </Link>

      <nav aria-label="Main" className="flex flex-col space-y-1">
        {groups.map((group, i) => (
          <div key={group.label ?? i} className="mt-3 first:mt-0">
            {group.label && (
              <div className="mb-1.5 hidden px-3 text-[11px] font-bold tracking-wider uppercase text-ink-tertiary lg:block">{group.label}</div>
            )}
            <div className="space-y-1">
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
                      "group relative flex h-11 items-center justify-center gap-3 rounded-xl px-2.5 text-[14.5px] transition-all lg:justify-start",
                      isActive
                        ? "bg-card font-semibold text-ink shadow-xs"
                        : "text-ink-secondary hover:bg-card/70 hover:text-ink",
                    )}
                  >
                    {/* Active Indicator Bar on Left */}
                    {isActive && (
                      <span
                        className="absolute top-2.5 bottom-2.5 left-0 w-1 rounded-r-full bg-accent"
                        aria-hidden="true"
                      />
                    )}

                    {/* Signature Squircle Icon Container */}
                    <div
                      className={cn(
                        "grid size-8 place-items-center rounded-xl shrink-0 transition-all",
                        isActive
                          ? cn("shadow-xs", toneClasses[section.tone])
                          : "bg-card-subtle text-ink-secondary group-hover:bg-accent-soft group-hover:text-accent group-hover:scale-105",
                      )}
                    >
                      <Icon size={18} strokeWidth={isActive ? 2.2 : 1.85} aria-hidden />
                    </div>

                    <span className="hidden truncate lg:inline">{section.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
