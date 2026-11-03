"use client";

import { Check, ChevronDown, ChevronRight, Plus, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { fieldButtonClass, fieldSizes, PopoverPanel, usePopover } from "@/components/ui/popover";
import { cn } from "@/lib/cn";

export type SelectOption = {
  value: string;
  label: string;
  hint?: string;
  /** Options with a group sit under a row with that name, which opens when tapped; options without one come first. */
  group?: string;
  /** Extra words the search box matches but the list doesn't show (e.g. a phone number). */
  keywords?: string;
};

type Row = { kind: "option"; option: SelectOption; inGroup: boolean } | { kind: "group"; name: string; count: number; expanded: boolean };

/** The rows on screen: ungrouped options, then each group's row followed by its options when it is open (or searched). */
function buildRows(options: SelectOption[], openGroups: Set<string>, query: string): Row[] {
  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, "");
  const matches = (o: SelectOption) =>
    !q || `${o.label} ${o.hint ?? ""} ${o.group ?? ""} ${o.keywords ?? ""}`.toLowerCase().includes(q) || (digits.length >= 3 && (o.keywords ?? "").replace(/\D/g, "").includes(digits));
  const rows: Row[] = options.filter((o) => !o.group && matches(o)).map((option) => ({ kind: "option", option, inGroup: false }));
  for (const name of new Set(options.flatMap((o) => (o.group ? [o.group] : [])))) {
    const members = options.filter((o) => o.group === name && matches(o));
    if (members.length === 0) continue;
    const expanded = Boolean(q) || openGroups.has(name);
    rows.push({ kind: "group", name, count: members.length, expanded });
    if (expanded) rows.push(...members.map((option) => ({ kind: "option" as const, option, inGroup: true })));
  }
  return rows;
}

const rowLabel = (row: Row) => (row.kind === "group" ? row.name : row.option.label);

/**
 * The app's dropdown, used instead of the browser's own so it looks the same on Android, iPhone, Windows and Mac.
 * A panel under the field on tablets and desktops, a bottom sheet with big rows on phones. Lists longer than
 * eight get a search box. Keyboard: arrows, Home/End, Enter, Escape and type-to-jump, as in a native select.
 * Grouped options (e.g. parties by kind) show a row per group; Enter or → opens it, ← closes it.
 */
export function Select({
  id,
  value,
  onChange,
  options,
  label,
  placeholder = "Choose…",
  size = "md",
  searchable,
  disabled,
  className,
  "aria-label": ariaLabel,
  action,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** The field's label: the sheet title on phones and the list's name for screen readers. */
  label?: string;
  placeholder?: string;
  size?: keyof typeof fieldSizes;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  /** A row above the options that starts something new (e.g. "New customer"); it gets what was typed in the search box. */
  action?: { label: string; onPick: (query: string) => void };
}) {
  const autoId = useId();
  const triggerId = id ?? `${autoId}-select`;
  const listId = `${autoId}-list`;
  const optionId = (i: number) => `${autoId}-option-${i}`;
  const name = label ?? ariaLabel ?? "Options";

  const popover = usePopover({ width: 240, height: 340 });
  const { triggerRef, open, sheet, close } = popover;
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const withSearch = searchable ?? options.length > 8;
  const selected = options.find((o) => o.value === value);
  const shown = useMemo(() => buildRows(options, openGroups, query), [options, openGroups, query]);

  function openMenu() {
    if (disabled) return;
    setQuery("");
    // Open with the chosen option's group already open, so the current choice is in view.
    const groups = new Set(selected?.group ? [selected.group] : []);
    setOpenGroups(groups);
    setActive(Math.max(0, buildRows(options, groups, "").findIndex((r) => r.kind === "option" && r.option.value === value)));
    popover.show();
  }

  function choose(option: SelectOption) {
    onChange(option.value);
    close();
  }

  function setGroup(name: string, expanded: boolean) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (expanded) next.add(name);
      else next.delete(name);
      return next;
    });
  }

  function pick(row: Row) {
    if (row.kind === "option") choose(row.option);
    else if (!query.trim()) setGroup(row.name, !row.expanded);
  }

  // Focus the search box (or the list) once open. On phones the list takes focus, so the keyboard only opens
  // when the search box is tapped.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => (withSearch && !sheet ? searchRef.current : listRef.current)?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, sheet, withSearch]);

  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // optionId only depends on autoId, which never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active, shown]);

  function onTriggerKey(e: KeyboardEvent) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openMenu();
    }
  }

  function onListKey(e: KeyboardEvent) {
    const last = shown.length - 1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(last, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if ((e.key === "Home" || e.key === "End") && !withSearch) {
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : last);
    } else if (e.key === "Enter" || (e.key === " " && !withSearch)) {
      e.preventDefault();
      if (shown[active]) pick(shown[active]);
    } else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && shown[active]?.kind === "group" && !query.trim()) {
      e.preventDefault();
      setGroup(rowLabel(shown[active]), e.key === "ArrowRight");
    } else if (e.key === "Escape" || e.key === "Tab") {
      e.preventDefault();
      close();
    } else if (!withSearch && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Type-to-jump, like a native select: letters typed within a second build up a prefix.
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 1000 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const match = shown.findIndex((r) => rowLabel(r).toLowerCase().startsWith(typed.current.text));
      if (match >= 0) setActive(match);
    }
  }

  const search = withSearch && (
    <div className="relative shrink-0 px-2 pt-2">
      <Search size={17} strokeWidth={1.75} className="pointer-events-none absolute left-5 top-1/2 mt-1 -translate-y-1/2 text-ink-tertiary" aria-hidden />
      <input
        ref={searchRef}
        type="text"
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={shown[active] ? optionId(active) : undefined}
        aria-label={`Search ${name.toLowerCase()}`}
        placeholder="Search"
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onListKey}
        className="h-11 w-full rounded-xl border border-hairline bg-card-subtle pl-10 pr-3 text-[16px] text-ink placeholder:text-ink-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
      />
    </div>
  );

  const actionRow = action && (
    <div className="shrink-0 px-1.5 pt-1.5">
      <button
        type="button"
        onClick={() => {
          const typed = query.trim();
          close();
          action.onPick(typed);
        }}
        className={cn("flex w-full items-center gap-2.5 rounded-xl px-3 font-medium text-accent hover:bg-accent-soft", sheet ? "min-h-12 text-[17px]" : "min-h-10 text-[15px]")}
      >
        <Plus size={18} strokeWidth={2.25} aria-hidden />
        {action.label}
        {query.trim() && <span className="min-w-0 truncate font-normal text-ink-secondary">“{query.trim()}”</span>}
      </button>
    </div>
  );

  const list = (
    <>
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={name}
        tabIndex={-1}
        aria-activedescendant={shown[active] ? optionId(active) : undefined}
        onKeyDown={onListKey}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 focus:outline-none"
      >
        {shown.map((row, i) => {
          const rowSize = sheet ? "min-h-12 py-2.5 text-[17px]" : "min-h-10 py-2 text-[15px]";
          if (row.kind === "group") {
            const Chevron = row.expanded ? ChevronDown : ChevronRight;
            return (
              <li
                key={`group-${row.name}`}
                id={optionId(i)}
                role="option"
                aria-selected={false}
                aria-label={`${row.name}, ${row.count}, ${row.expanded ? "showing" : "tap to show"}`}
                onPointerMove={() => setActive(i)}
                onClick={() => pick(row)}
                className={cn("mt-1 flex cursor-pointer items-center gap-2 rounded-xl px-3 font-semibold text-ink", rowSize, i === active && "bg-accent-soft")}
              >
                <Chevron size={18} strokeWidth={2} className="shrink-0 text-ink-secondary" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{row.name}</span>
                <span className="shrink-0 rounded-full bg-hairline px-2 py-0.5 text-[12px] font-medium tabular-nums text-ink-secondary">{row.count}</span>
              </li>
            );
          }
          const o = row.option;
          const isSelected = o.value === value;
          return (
            <li
              key={o.value}
              id={optionId(i)}
              role="option"
              aria-selected={isSelected}
              onPointerMove={() => setActive(i)}
              onClick={() => choose(o)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl px-3",
                rowSize,
                row.inGroup && "ml-4 rounded-l-none border-l-2 border-hairline",
                i === active && "bg-accent-soft",
                isSelected ? "font-medium text-accent" : "text-ink",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate">{o.label}</span>
                {o.hint && <span className="block truncate text-[13px] font-normal text-ink-secondary">{o.hint}</span>}
              </span>
              {isSelected && <Check size={18} strokeWidth={2.25} className="shrink-0" aria-hidden />}
            </li>
          );
        })}
      </ul>
      {shown.length === 0 && <p className="px-4 pb-5 pt-3 text-center text-[15px] text-ink-secondary">{options.length ? "No matches" : "Nothing to choose yet"}</p>}
    </>
  );

  return (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onTriggerKey}
        className={cn(
          fieldButtonClass,
          fieldSizes[size],
          open && "border-accent ring-2 ring-accent/25",
          className,
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-ink-tertiary")}>
          {selected ? selected.label : placeholder}
          {selected?.hint && <span className="text-ink-secondary"> · {selected.hint}</span>}
        </span>
        <ChevronDown size={18} strokeWidth={1.75} className={cn("shrink-0 text-ink-secondary transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      <PopoverPanel popover={popover} title={name}>
        {search}
        {actionRow}
        {list}
      </PopoverPanel>
    </>
  );
}
