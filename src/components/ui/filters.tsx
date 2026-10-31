"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search
        size={17}
        strokeWidth={1.75}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-tertiary"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-full border border-hairline bg-card pl-10 pr-10 text-[16px] text-ink placeholder:text-ink-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-hairline text-ink-secondary"
        >
          <X size={13} strokeWidth={2.25} aria-hidden />
        </button>
      )}
    </div>
  );
}

/** Pill chips for one filter; the selected chip uses the accent-soft colour. */
export function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-[14px] transition-colors",
              selected
                ? "bg-accent-soft font-medium text-accent"
                : "border border-hairline bg-card text-ink-secondary hover:text-ink",
            )}
          >
            {o.label}
            {o.count !== undefined && <span className="ml-1.5 tabular-nums">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
