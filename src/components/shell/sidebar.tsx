"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/data/types";
import { activeHref, sidebarGroups, toneClasses } from "@/lib/sections";

export function Sidebar({
  pathname,
  role,
  firmName,
  collapsed = false,
  onToggleCollapse,
}: {
  pathname: string;
  role: Role;
  firmName: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const groups = sidebarGroups
    .map((group) => ({ ...group, items: group.items.filter((s) => s.roles.includes(role)) }))
    .filter((group) => group.items.length > 0);

  const active = activeHref(
    pathname,
    groups.flatMap((g) => g.items.map((s) => s.href)),
  );

  // Collapsible section accordions (Sales, Money, Records, Insights, Private)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ska_sidebar_sections");
      if (saved) setCollapsedGroups(JSON.parse(saved));
    } catch {}
  }, []);

  function toggleGroup(label: string) {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      try {
        localStorage.setItem("ska_sidebar_sections", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        "fixed inset-y-0 left-[env(safe-area-inset-left)] z-20 hidden print:!hidden flex-col overflow-y-auto border-r border-[#15253e] bg-[#081528] text-white py-4 transition-all duration-200 md:flex",
        collapsed ? "w-[72px] px-2.5" : "w-64 px-3.5",
      )}
    >
      {/* SIDEBAR HEADER: Brand Badge + Collapse / Expand Button */}
      <div className={cn("mb-4 flex items-center", collapsed ? "flex-col gap-2" : "justify-between gap-2 px-1")}>
        <Link
          href="/"
          aria-label={`${firmName}, home`}
          className={cn(
            "flex items-center gap-2.5 rounded-xl transition-opacity hover:opacity-90",
            collapsed && "justify-center p-1",
          )}
        >
          <div className="size-9 rounded-[10px] bg-gradient-to-tr from-[#ea580c] via-[#f59e0b] to-[#fbbf24] p-0.5 shadow-xs shrink-0 flex items-center justify-center">
            <div className="size-full rounded-[8px] bg-[#0c1e38] flex items-center justify-center p-1">
              <Image
                src="/logo.png"
                alt="SKA"
                width={32}
                height={32}
                unoptimized
                className="object-contain"
              />
            </div>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="line-clamp-1 text-[13.5px] font-bold tracking-tight text-white leading-tight">
                {firmName}
              </span>
              <span className="block text-[10px] font-semibold tracking-wider text-[#38bdf8] uppercase">
                DEALERSHIP PORTAL
              </span>
            </div>
          )}
        </Link>

        {/* Sidebar Collapse / Expand Toggle Button */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer shrink-0",
              collapsed && "mt-1",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} strokeWidth={1.85} aria-hidden />
            ) : (
              <PanelLeftClose size={18} strokeWidth={1.85} aria-hidden />
            )}
          </button>
        )}
      </div>

      {/* NAVIGATION GROUPS WITH COLLAPSIBLE ACCORDIONS */}
      <nav aria-label="Main" className="flex flex-col space-y-1">
        {groups.map((group, i) => {
          // If the group contains the currently active page, keep it open so the user always sees it
          const containsActive = group.items.some((s) => s.href === active);
          const isGroupCollapsed = Boolean(group.label && collapsedGroups[group.label] && !containsActive);

          return (
            <div key={group.label ?? i} className="mt-2.5 first:mt-0">
              {/* Group Accordion Header (when expanded) */}
              {group.label && !collapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label!)}
                  aria-expanded={!isGroupCollapsed}
                  className="mb-1 flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-bold tracking-wider uppercase text-slate-400 hover:bg-white/[0.06] hover:text-white transition-all cursor-pointer group/hdr"
                >
                  <span className="flex items-center gap-1.5">
                    <span>{group.label}</span>
                    {isGroupCollapsed && (
                      <span className="rounded-full bg-white/[0.12] px-1.5 py-0.2 text-[10px] font-normal text-slate-300">
                        {group.items.length}
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    size={13}
                    strokeWidth={2.2}
                    className={cn(
                      "text-slate-400 transition-transform duration-200 group-hover/hdr:text-slate-200",
                      isGroupCollapsed && "-rotate-90",
                    )}
                  />
                </button>
              )}

              {/* Group Divider when in mini/collapsed sidebar */}
              {group.label && collapsed && i > 0 && (
                <div className="my-2 mx-1.5 h-px bg-white/10" aria-hidden="true" />
              )}

              {/* Group Nav Items */}
              {(!isGroupCollapsed || collapsed) && (
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
                          "group relative flex h-10 items-center gap-2.5 rounded-xl px-2.5 text-[14px] transition-all",
                          collapsed ? "justify-center px-1" : "justify-start",
                          isActive
                            ? "bg-white/[0.14] font-semibold text-white shadow-xs"
                            : "text-slate-300 hover:bg-white/[0.08] hover:text-white font-medium",
                        )}
                      >
                        {/* Active Indicator Bar on Left */}
                        {isActive && (
                          <span
                            className="absolute top-2 bottom-2 left-0 w-1 rounded-r-full bg-[#38bdf8] shadow-xs"
                            aria-hidden="true"
                          />
                        )}

                        {/* Signature Squircle Icon Container */}
                        <div
                          className={cn(
                            "grid size-8 place-items-center rounded-xl shrink-0 transition-all",
                            isActive
                              ? cn("shadow-xs", toneClasses[section.tone])
                              : "bg-white/[0.06] text-slate-300 group-hover:bg-[#0068d1]/30 group-hover:text-[#38bdf8] group-hover:scale-105",
                          )}
                        >
                          <Icon size={17} strokeWidth={isActive ? 2.2 : 1.85} aria-hidden />
                        </div>

                        {!collapsed && <span className="truncate">{section.title}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
