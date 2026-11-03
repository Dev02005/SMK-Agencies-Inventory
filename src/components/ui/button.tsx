import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "plain";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  // One blue pill per screen (Apple style).
  primary: "h-11 px-[21px] text-[17px] bg-accent text-white hover:bg-[#0071e3] active:bg-[#0060c0]",
  secondary: "h-11 px-[21px] text-[15px] bg-card text-accent border border-accent hover:bg-accent-soft",
  plain: "h-auto px-0 text-[15px] text-link hover:underline",
};

export function buttonClass(variant: Variant = "primary", className?: string) {
  return cn(base, variants[variant], className);
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

const iconVariants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-[#0071e3] active:bg-[#0060c0]",
  secondary: "bg-card text-accent border border-accent hover:bg-accent-soft",
  plain: "text-accent hover:bg-accent-soft",
};

/** The look of an icon-only button, for links and other elements that act as one. */
export function iconButtonClass(variant: Variant = "secondary", className?: string) {
  return cn(base, "relative size-11 shrink-0 p-0", iconVariants[variant], className);
}

/**
 * A round button that shows only its icon. The label is what screen readers announce and the tooltip on hover, so
 * every action still has a name. `badge` adds a small count (e.g. how many are selected).
 */
export function IconButton({
  label,
  variant = "secondary",
  badge,
  className,
  children,
  ...props
}: Omit<ComponentProps<"button">, "aria-label" | "title"> & { label: string; variant?: Variant; badge?: number }) {
  return (
    <button type="button" aria-label={badge ? `${label} (${badge})` : label} title={label} className={iconButtonClass(variant, className)} {...props}>
      {children}
      {Boolean(badge) && (
        <span aria-hidden className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-semibold tabular-nums text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

export function IconButtonLink({
  label,
  variant = "secondary",
  className,
  ...props
}: Omit<ComponentProps<typeof Link>, "aria-label" | "title"> & { label: string; variant?: Variant }) {
  return <Link aria-label={label} title={label} className={iconButtonClass(variant, className)} {...props} />;
}
