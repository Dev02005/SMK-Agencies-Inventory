"use client";

import { CalendarDays, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { fieldButtonClass, fieldSizes, PopoverPanel, usePopover } from "@/components/ui/popover";
import { cn } from "@/lib/cn";
import { addDaysISO, formatDate, todayISO } from "@/lib/format";

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const partsOf = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
};
const weekdayOf = (iso: string) => {
  const { y, m, d } = partsOf(iso);
  return new Date(Date.UTC(y, m, d)).getUTCDay();
};

/** The 42 days (six weeks, Sunday first) shown for a month, with the edges of the months either side. */
function monthGrid(y: number, m: number) {
  const first = isoOf(y, m, 1);
  const start = addDaysISO(first, -weekdayOf(first));
  return Array.from({ length: 42 }, (_, i) => addDaysISO(start, i));
}

/** The same day in another month, kept inside that month ("31 Jan" + 1 month → "28 Feb"). */
function shiftMonths(iso: string, by: number) {
  const { y, m, d } = partsOf(iso);
  const total = y * 12 + m + by;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return isoOf(ny, nm, Math.min(d, last));
}

/**
 * The app's date field, used instead of the browser's own so it looks the same everywhere. A calendar panel
 * under the field (a bottom sheet on phones). Value is "YYYY-MM-DD" or "" like a native date input.
 * Keyboard: arrows move a day or a week, Page Up/Down a month (with Shift a year), Home/End the week, Enter picks.
 */
export function DatePicker({
  id,
  value,
  onChange,
  label,
  placeholder = "Choose a date",
  min,
  max,
  clearable = false,
  size = "md",
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** The field's label: the sheet title on phones and the calendar's name for screen readers. */
  label?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  /** Offers "Clear", for dates that may be left empty. */
  clearable?: boolean;
  size?: keyof typeof fieldSizes;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const autoId = useId();
  const name = label ?? ariaLabel ?? "Date";
  const popover = usePopover({ width: 312, height: 420 });
  const { triggerRef, open, close } = popover;
  const gridRef = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState(value);
  // Read when the calendar opens, not while rendering: pages are built ahead of time, when there is no today.
  const [today, setToday] = useState("");
  const allowed = (iso: string) => (!min || iso >= min) && (!max || iso <= max);
  // The month on screen. The calendar only shows while open, and opening always sets the focused day.
  const { y, m } = focus ? partsOf(focus) : { y: 0, m: 0 };
  const days = focus ? monthGrid(y, m) : [];

  function openPicker() {
    if (disabled) return;
    const now = todayISO();
    setToday(now);
    setFocus(value || (allowed(now) ? now : (min ?? max ?? now)));
    popover.show();
  }

  function pick(iso: string) {
    if (!allowed(iso)) return;
    onChange(iso);
    close();
  }

  // Keep keyboard focus on the focused day as it moves (and when the calendar opens).
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, focus]);

  function onGridKey(e: KeyboardEvent) {
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDaysISO(focus, -1),
      ArrowRight: () => addDaysISO(focus, 1),
      ArrowUp: () => addDaysISO(focus, -7),
      ArrowDown: () => addDaysISO(focus, 7),
      PageUp: () => shiftMonths(focus, e.shiftKey ? -12 : -1),
      PageDown: () => shiftMonths(focus, e.shiftKey ? 12 : 1),
      Home: () => addDaysISO(focus, -weekdayOf(focus)),
      End: () => addDaysISO(focus, 6 - weekdayOf(focus)),
    };
    if (moves[e.key]) {
      e.preventDefault();
      setFocus(moves[e.key]());
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(focus);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  const step = (by: number, label: string, Icon: typeof ChevronLeft) => (
    <button
      type="button"
      onClick={() => setFocus(shiftMonths(focus, by))}
      aria-label={label}
      className="grid size-9 shrink-0 place-items-center rounded-full text-ink-secondary hover:bg-hairline hover:text-ink"
    >
      <Icon size={18} strokeWidth={2} aria-hidden />
    </button>
  );

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? close() : openPicker())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        className={cn(fieldButtonClass, fieldSizes[size], "tabular-nums", open && "border-accent ring-2 ring-accent/25", className)}
      >
        <CalendarDays size={size === "md" ? 19 : 16} strokeWidth={1.75} className="shrink-0 text-accent" aria-hidden />
        <span className={cn("min-w-0 flex-1 truncate", !value && "text-ink-tertiary")}>{value ? formatDate(value) : placeholder}</span>
      </button>

      <PopoverPanel popover={popover} title={name}>
        <div className="flex items-center gap-1 px-3 pt-3">
          {step(-12, "Previous year", ChevronsLeft)}
          {step(-1, "Previous month", ChevronLeft)}
          <p id={`${autoId}-month`} className="flex-1 text-center text-[16px] font-semibold tracking-[-0.2px] text-ink" aria-live="polite">
            {monthNames[m]} {y}
          </p>
          {step(1, "Next month", ChevronRight)}
          {step(12, "Next year", ChevronsRight)}
        </div>
        <div className="grid grid-cols-7 px-3 pt-2 text-center text-[12px] font-medium text-ink-tertiary" aria-hidden>
          {weekdays.map((w) => (
            <span key={w} className="py-1">
              {w}
            </span>
          ))}
        </div>
        <div ref={gridRef} role="group" aria-labelledby={`${autoId}-month`} onKeyDown={onGridKey} className="grid grid-cols-7 gap-y-1 px-3 pb-2">
          {days.map((iso) => {
            const inMonth = partsOf(iso).m === m;
            const selected = iso === value;
            const ok = allowed(iso);
            return (
              <button
                key={iso}
                type="button"
                data-day={iso}
                tabIndex={iso === focus ? 0 : -1}
                aria-pressed={selected}
                aria-current={iso === today ? "date" : undefined}
                aria-label={formatDate(iso)}
                aria-disabled={!ok}
                onClick={() => pick(iso)}
                className={cn(
                  "mx-auto grid size-10 place-items-center rounded-full text-[15px] tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                  selected
                    ? "bg-accent font-semibold text-white"
                    : iso === today
                      ? "font-semibold text-accent ring-1 ring-inset ring-accent/40 hover:bg-accent-soft"
                      : inMonth
                        ? "text-ink hover:bg-accent-soft"
                        : "text-ink-tertiary/70 hover:bg-hairline",
                  !ok && "pointer-events-none opacity-30",
                )}
              >
                {partsOf(iso).d}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-hairline px-4 py-2.5">
          <button type="button" onClick={() => pick(today)} disabled={!allowed(today)} className="text-[15px] font-medium text-link hover:underline disabled:opacity-40">
            Today
          </button>
          {clearable && value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                close();
              }}
              className="text-[15px] text-ink-secondary hover:text-ink hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </PopoverPanel>
    </>
  );
}
