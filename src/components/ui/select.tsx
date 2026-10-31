"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export type SelectOption = { value: string; label: string; hint?: string };

const sizes = {
  md: "h-12 rounded-xl px-3.5 text-[17px]",
  sm: "h-10 rounded-xl px-3 text-[15px]",
  pill: "h-9 rounded-full px-3.5 text-[14px]",
};

type Position = { top?: number; bottom?: number; left: number; width: number; maxHeight: number };

/**
 * The app's dropdown, used instead of the browser's own so it looks the same on Android, iPhone, Windows and Mac.
 * A panel under the field on tablets and desktops, a bottom sheet with big rows on phones. Lists longer than
 * eight get a search box. Keyboard: arrows, Home/End, Enter, Escape and type-to-jump, as in a native select.
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
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** The field's label: the sheet title on phones and the list's name for screen readers. */
  label?: string;
  placeholder?: string;
  size?: keyof typeof sizes;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const autoId = useId();
  const triggerId = id ?? `${autoId}-select`;
  const listId = `${autoId}-list`;
  const optionId = (i: number) => `${autoId}-option-${i}`;
  const name = label ?? ariaLabel ?? "Options";

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [pos, setPos] = useState<Position | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  // Where the panel is mounted: inside the field's own <main>, so it stays part of the page's main content.
  const [root, setRoot] = useState<HTMLElement | null>(null);

  const withSearch = searchable ?? options.length > 8;
  const selected = options.find((o) => o.value === value);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.max(r.width, 240);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    // Open upwards only when there is clearly more room above.
    if (below >= 220 || below >= above) setPos({ top: r.bottom + 6, left, width, maxHeight: Math.min(340, below) });
    else setPos({ bottom: window.innerHeight - r.top + 6, left, width, maxHeight: Math.min(340, above) });
  }, []);

  function openMenu() {
    if (disabled) return;
    const phone = !window.matchMedia("(min-width: 768px)").matches;
    setSheet(phone);
    setQuery("");
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setRoot(triggerRef.current?.closest("main") ?? document.body);
    if (!phone) place();
    setOpen(true);
  }

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  function choose(option: SelectOption) {
    onChange(option.value);
    close();
  }

  // Focus the search box (or the list) once open; keep the panel next to the field; close on an outside tap.
  useEffect(() => {
    if (!open) return;
    // On phones the list takes focus, so the keyboard only opens when the search box is tapped.
    const frame = requestAnimationFrame(() => (withSearch && !sheet ? searchRef.current : listRef.current)?.focus());
    function onPointer(event: PointerEvent) {
      const target = event.target as Node;
      if (!popupRef.current?.contains(target) && !triggerRef.current?.contains(target)) close(false);
    }
    window.addEventListener("pointerdown", onPointer);
    if (!sheet) {
      window.addEventListener("scroll", place, true);
      window.addEventListener("resize", place);
    }
    const body = document.body.style;
    const overflow = body.overflow;
    if (sheet) body.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      body.overflow = overflow;
    };
  }, [open, sheet, withSearch, place, close]);

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
      if (shown[active]) choose(shown[active]);
    } else if (e.key === "Escape" || e.key === "Tab") {
      e.preventDefault();
      close();
    } else if (!withSearch && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Type-to-jump, like a native select: letters typed within a second build up a prefix.
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 1000 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const match = shown.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
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
        {shown.map((o, i) => {
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
                sheet ? "min-h-12 py-2.5 text-[17px]" : "min-h-10 py-2 text-[15px]",
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
          "flex w-full items-center gap-2 border border-divider bg-card text-left text-ink transition-colors hover:border-ink-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:pointer-events-none disabled:bg-card-subtle disabled:text-ink-tertiary",
          sizes[size],
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

      {open &&
        root &&
        createPortal(
          sheet ? (
            <div className="fixed inset-0 z-50 flex items-end">
              <div className="absolute inset-0 bg-black/25" aria-hidden />
              <div
                ref={popupRef}
                role="dialog"
                aria-modal="true"
                aria-label={name}
                className="animate-sheet-up relative flex max-h-[78dvh] w-full flex-col rounded-t-sheet bg-card pb-[env(safe-area-inset-bottom)] shadow-sheet"
              >
                <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-1 pt-4">
                  <p className="truncate text-[17px] font-semibold tracking-[-0.3px] text-ink">{name}</p>
                  <button type="button" onClick={() => close()} aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-full bg-hairline text-ink-secondary">
                    <X size={16} strokeWidth={2} aria-hidden />
                  </button>
                </div>
                {search}
                {list}
              </div>
            </div>
          ) : (
            pos && (
              <div
                ref={popupRef}
                className="animate-fade-up fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-hairline bg-card shadow-raised"
                style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
              >
                {search}
                {list}
              </div>
            )
          ),
          root,
        )}
    </>
  );
}
