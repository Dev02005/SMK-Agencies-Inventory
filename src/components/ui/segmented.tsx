"use client";

import { cn } from "@/lib/cn";

/** Apple-style segmented control: grey track, white selected pill. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("grid rounded-full bg-hairline p-0.5", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-10 truncate whitespace-nowrap rounded-full px-1 text-[14px] transition-colors sm:text-[15px]",
              selected ? "bg-card font-semibold text-ink shadow-[0_1px_4px_rgba(0,0,0,0.08)]" : "text-ink-secondary hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
