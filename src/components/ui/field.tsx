import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** 48px fields with 12px corners (design plan); the label sits above, help text below. */
export const inputClass =
  "h-12 w-full rounded-xl border border-divider bg-card px-3.5 text-[17px] text-ink placeholder:text-ink-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:bg-card-subtle disabled:text-ink-tertiary";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] text-ink-secondary">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[13px] text-danger">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-[13px] text-ink-secondary">{hint}</p>
      )}
    </div>
  );
}

/** Input with a fixed prefix or suffix, e.g. "₹" or "bags". */
export function AffixInput({
  prefix,
  suffix,
  className,
  ...props
}: ComponentProps<"input"> & { prefix?: string; suffix?: string }) {
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[17px] text-ink-secondary">
          {prefix}
        </span>
      )}
      {/* Room for the prefix: one sign ("₹") or a longer one ("+91"), so typed digits never run under it. */}
      <input className={cn(inputClass, "tabular-nums", prefix && (prefix.length > 1 ? "pl-[3.25rem]" : "pl-8"), suffix && "pr-14", className)} {...props} />
      {suffix && (
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[15px] text-ink-secondary">
          {suffix}
        </span>
      )}
    </div>
  );
}
