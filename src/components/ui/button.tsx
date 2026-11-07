import Link from "next/link";
import { LoaderCircle, type LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "plain" | "ghost" | "danger" | "gold";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-40 active:scale-[0.99]";

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3.5 text-[13px] rounded-xl",
  md: "h-10 px-4.5 text-[15px] rounded-xl",
  lg: "h-11 px-5 text-[16px] rounded-2xl",
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-[#005bb8] active:bg-[#004e9e] shadow-xs",
  secondary: "bg-card text-accent border border-accent/40 hover:bg-accent-soft hover:border-accent shadow-xs",
  plain: "h-auto px-0 text-[15px] text-link hover:underline bg-transparent",
  ghost: "text-ink-secondary hover:bg-hairline hover:text-ink bg-transparent",
  danger: "bg-danger text-white hover:bg-danger/90 shadow-xs",
  gold: "bg-amber-500/10 text-amber-600 border border-amber-500/30 hover:bg-amber-500/20",
};

function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  const isPlain = variant === "plain";
  return cn(base, isPlain ? variants[variant] : cn(sizeClasses[size], variants[variant]), className);
}

export function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  loading,
  className,
  children,
  disabled,
  ...props
}: ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
}) {
  const iconSize = size === "sm" ? 14 : size === "lg" ? 18 : 16;
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={buttonClass(variant, size, className)}
      {...props}
    >
      {loading ? (
        <LoaderCircle size={iconSize} className="animate-spin" aria-hidden />
      ) : Icon ? (
        <Icon size={iconSize} strokeWidth={2} aria-hidden />
      ) : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  icon: Icon,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
}) {
  const iconSize = size === "sm" ? 14 : size === "lg" ? 18 : 16;
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      {Icon && <Icon size={iconSize} strokeWidth={2} aria-hidden />}
      {children}
    </Link>
  );
}

const iconVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-[#005bb8] active:bg-[#004e9e] shadow-xs",
  secondary: "bg-card text-ink-secondary border border-hairline hover:bg-accent-soft hover:text-accent hover:border-accent/40 shadow-xs",
  plain: "text-accent hover:bg-accent-soft bg-transparent",
  ghost: "text-ink-tertiary hover:bg-hairline hover:text-ink bg-transparent",
  danger: "bg-danger-soft text-danger hover:bg-danger hover:text-white",
  gold: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20",
};

/** Signature squircle icon button */
export function iconButtonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string) {
  const sizeMap: Record<ButtonSize, string> = {
    sm: "size-8 rounded-lg",
    md: "size-9 rounded-xl",
    lg: "size-11 rounded-2xl",
  };
  return cn(base, "relative shrink-0 p-0", sizeMap[size], iconVariants[variant], className);
}

export function IconButton({
  label,
  variant = "secondary",
  size = "md",
  badge,
  className,
  children,
  ...props
}: Omit<ComponentProps<"button">, "aria-label" | "title"> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  badge?: number;
}) {
  return (
    <button
      type="button"
      aria-label={badge ? `${label} (${badge})` : label}
      title={label}
      className={iconButtonClass(variant, size, className)}
      {...props}
    >
      {children}
      {Boolean(badge) && (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-semibold tabular-nums text-white"
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export function IconButtonLink({
  label,
  variant = "secondary",
  size = "md",
  className,
  ...props
}: Omit<ComponentProps<typeof Link>, "aria-label" | "title"> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <Link
      aria-label={label}
      title={label}
      className={iconButtonClass(variant, size, className)}
      {...props}
    />
  );
}
