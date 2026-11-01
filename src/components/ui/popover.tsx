"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Position = { top?: number; bottom?: number; left: number; width: number; maxHeight: number };

/**
 * What the app's own pickers (Select, DatePicker) share: a panel under the field on tablets and desktops, a
 * bottom sheet on phones. It follows the field while the page scrolls, closes on a tap outside, and keeps the
 * page from scrolling behind the sheet. Each picker handles its own focus and keys.
 */
export function usePopover<T extends HTMLElement = HTMLButtonElement>({ width = 240, height = 340 }: { width?: number; height?: number } = {}) {
  const triggerRef = useRef<T>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [pos, setPos] = useState<Position | null>(null);
  // Mounted inside the field's own <main>, so the panel stays part of the page's main content.
  const [root, setRoot] = useState<HTMLElement | null>(null);

  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const w = Math.min(Math.max(r.width, width), window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    // Open upwards only when there is clearly more room above.
    if (below >= Math.min(height, 220) || below >= above) setPos({ top: r.bottom + 6, left, width: w, maxHeight: Math.min(height, below) });
    else setPos({ bottom: window.innerHeight - r.top + 6, left, width: w, maxHeight: Math.min(height, above) });
  }, [width, height]);

  /** Opens the picker; returns true when it opens as a phone sheet. */
  const show = useCallback(() => {
    const phone = !window.matchMedia("(min-width: 768px)").matches;
    setSheet(phone);
    setRoot(triggerRef.current?.closest("main") ?? document.body);
    if (!phone) place();
    setOpen(true);
    return phone;
  }, [place]);

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
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
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      body.overflow = overflow;
    };
  }, [open, sheet, place, close]);

  return { triggerRef, popupRef, open, sheet, pos, root, show, close };
}

export type PopoverState = ReturnType<typeof usePopover>;

/** The open picker: a titled bottom sheet on phones, a floating panel elsewhere. */
export function PopoverPanel({ popover, title, children }: { popover: PopoverState; title: string; children: ReactNode }) {
  const { open, root, sheet, pos, popupRef, close } = popover;
  if (!open || !root) return null;
  return createPortal(
    sheet ? (
      <div className="fixed inset-0 z-50 flex items-end">
        <div className="absolute inset-0 bg-black/25" aria-hidden />
        <div
          ref={popupRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="animate-sheet-up relative flex max-h-[78dvh] w-full flex-col rounded-t-sheet bg-card pb-[env(safe-area-inset-bottom)] shadow-sheet"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-1 pt-4">
            <p className="truncate text-[17px] font-semibold tracking-[-0.3px] text-ink">{title}</p>
            <button type="button" onClick={() => close()} aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-full bg-hairline text-ink-secondary">
              <X size={16} strokeWidth={2} aria-hidden />
            </button>
          </div>
          {children}
        </div>
      </div>
    ) : (
      pos && (
        <div
          ref={popupRef}
          className="animate-fade-up fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-hairline bg-card shadow-raised"
          style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
        >
          {children}
        </div>
      )
    ),
    root,
  );
}

/** The look of a picker's field button, shared so dates, times and lists line up with text boxes. */
export const fieldButtonClass =
  "flex w-full items-center gap-2 border border-divider bg-card text-left text-ink transition-colors hover:border-ink-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:pointer-events-none disabled:bg-card-subtle disabled:text-ink-tertiary";

export const fieldSizes = {
  md: "h-12 rounded-xl px-3.5 text-[17px]",
  sm: "h-10 rounded-xl px-3 text-[15px]",
  pill: "h-9 rounded-full px-3.5 text-[14px]",
};
