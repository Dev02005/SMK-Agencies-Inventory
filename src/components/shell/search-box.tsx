"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { Role } from "@/lib/data/types";
import { home, visibleSections } from "@/lib/sections";

/** Finds screens for now; parties and bills join the results once the database is connected. */
export function SearchBox({ role, className }: { role: Role; className?: string }) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Screens whose name starts with the words come first, then names that contain them, then descriptions.
  const q = query.trim().toLowerCase();
  const rank = (s: { title: string; description: string }) => {
    const title = s.title.toLowerCase();
    return title.startsWith(q) ? 0 : title.includes(q) ? 1 : s.description.toLowerCase().includes(q) ? 2 : 3;
  };
  const matches = q
    ? [home, ...visibleSections(role)]
        .map((s) => ({ s, r: rank(s) }))
        .filter((m) => m.r < 3)
        .sort((a, b) => a.r - b.r)
        .map((m) => m.s)
        .slice(0, 6)
    : [];
  const showList = open && matches.length > 0;
  const current = Math.min(active, Math.max(0, matches.length - 1));

  function go(href: string) {
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
    router.push(href);
  }

  return (
    <div className={cn("relative w-full max-w-md", className)}>
      <Search
        size={17}
        strokeWidth={1.75}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-tertiary"
        aria-hidden
      />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={showList ? `${listId}-${current}` : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            setActive(Math.max(0, Math.min(matches.length - 1, current + (e.key === "ArrowDown" ? 1 : -1))));
          }
          if (e.key === "Enter" && matches[current]) go(matches[current].href);
          if (e.key === "Escape") inputRef.current?.blur();
        }}
        placeholder="Search screens"
        aria-label="Search screens"
        className="h-9 w-full rounded-full bg-black/[0.06] pl-10 pr-16 text-[16px] text-ink placeholder:text-ink-tertiary focus:bg-card focus:outline-none focus:ring-2 focus:ring-accent/40"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-divider px-1.5 text-[11px] text-ink-secondary">
        Ctrl K
      </kbd>
      {showList && (
        <ul id={listId} className="surface absolute left-0 right-0 top-11 z-40 overflow-hidden p-1.5" role="listbox" aria-label="Screens">
          {matches.map((s, i) => {
            const Icon = s.icon;
            return (
              <li
                key={s.href}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === current}
                onMouseDown={(e) => e.preventDefault()}
                onMouseMove={() => setActive(i)}
                onClick={() => go(s.href)}
                className={cn("flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2", i === current && "bg-card-subtle")}
              >
                <Icon size={18} strokeWidth={1.75} className="shrink-0 text-ink-secondary" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[15px] text-ink">{s.title}</span>
                  <span className="block truncate text-[12px] text-ink-secondary">{s.description}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
