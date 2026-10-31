"use client";

import { cn } from "@/lib/cn";

/** iOS-style on/off switch; the label sits beside it and is part of the same button for a large tap area. */
export function Switch({
  label,
  hint,
  checked,
  onChange,
  className,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("flex w-full items-center justify-between gap-4 py-2 text-left", className)}
    >
      <span className="min-w-0">
        <span className="block text-[15px] text-ink">{label}</span>
        {hint && <span className="block text-[13px] text-ink-secondary">{hint}</span>}
      </span>
      <span className={cn("relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors", checked ? "bg-good" : "bg-divider")} aria-hidden>
        <span
          className={cn(
            "absolute top-[2px] size-[27px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.15)] transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-[2px]",
          )}
        />
      </span>
    </button>
  );
}
